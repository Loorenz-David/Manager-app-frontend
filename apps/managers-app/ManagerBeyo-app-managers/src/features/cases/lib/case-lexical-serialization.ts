import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_LOW,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
  getStyleObjectFromCSS,
} from "lexical";

import {
  getCaseComposerColorValue,
  type CaseComposerColorToken,
} from "../components/composer/CaseColorPalette";
import type {
  CaseInlinePart,
  CaseInlinePartMarks,
  CaseMessageContent,
} from "../message-content";
import {
  toBackendMessageContent,
  toBackendPlainText,
} from "./message-content-adapter";

const LARGE_TEXT_FONT_SIZE = "1.35rem";
const SMALL_TEXT_FONT_SIZE = "0.875rem";
const LARGE_TEXT_STYLE = `font-size: ${LARGE_TEXT_FONT_SIZE};`;
const SMALL_TEXT_STYLE = `font-size: ${SMALL_TEXT_FONT_SIZE};`;
const CASE_COMPOSER_INLINE_COLOR = "var(--case-composer-color-accent)";
const CASE_COMPOSER_ANIMATION_STYLE_PROPERTY = "--case-composer-animation";
const CASE_COMPOSER_SHAKE_ANIMATION =
  "case-composer-inline-shake 320ms ease-in-out 1";
const CASE_COMPOSER_PULSE_ANIMATION =
  "case-composer-inline-pulse 360ms ease-out 1";

export const CASE_RICH_TEXT_TEST_IDS = {
  composer: "case-rich-composer",
  editor: "case-rich-composer-editor",
} as const;

type TextSegment = {
  marks?: CaseInlinePartMarks;
  text: string;
};

export type CaseComposerToolbarState = {
  activeColor: string | null;
  bold: boolean;
  underline: boolean;
  big: boolean;
  color: boolean;
  shake: boolean;
  pulse: boolean;
};

type ComposerSize = Exclude<NonNullable<CaseInlinePartMarks["size"]>, "base">;
type ComposerAnimation = "shake" | "pulse";

const EMPTY_TOOLBAR_STATE: CaseComposerToolbarState = {
  activeColor: null,
  big: false,
  bold: false,
  color: false,
  pulse: false,
  shake: false,
  underline: false,
};
const pendingFirstTypingAnimationReplay = new WeakMap<
  LexicalEditor,
  ComposerAnimation | null
>();

function toInlineStyleString(styleObject: Record<string, string>): string {
  return Object.entries(styleObject)
    .map(([property, value]) => `${property}: ${value};`)
    .join(" ");
}

function getAnimationStyleValue(animation: ComposerAnimation): string {
  return animation === "shake"
    ? CASE_COMPOSER_SHAKE_ANIMATION
    : CASE_COMPOSER_PULSE_ANIMATION;
}

function readComposerAnimation(
  styleObject: Record<string, string>,
): ComposerAnimation | undefined {
  const animation = styleObject[CASE_COMPOSER_ANIMATION_STYLE_PROPERTY];

  if (animation === "shake" || animation === "pulse") {
    return animation;
  }

  return undefined;
}

function buildStyleObjectFromMarks(
  marks: CaseInlinePartMarks | undefined,
): Record<string, string> {
  const styleObject: Record<string, string> = {};

  if (marks?.size === "large") {
    styleObject["font-size"] = LARGE_TEXT_FONT_SIZE;
  } else if (marks?.size === "small") {
    styleObject["font-size"] = SMALL_TEXT_FONT_SIZE;
  }

  if (marks?.color) {
    styleObject.color = marks.color;
  }

  if (marks?.animation === "shake" || marks?.animation === "pulse") {
    styleObject.display = "inline-block";
    styleObject[CASE_COMPOSER_ANIMATION_STYLE_PROPERTY] = marks.animation;
    styleObject.animation = getAnimationStyleValue(marks.animation);
    styleObject["transform-origin"] = "center";
  }

  return styleObject;
}

function getReadableText(part: CaseInlinePart): string {
  if (part.kind === "label") {
    return part.text || part.value;
  }

  if (part.kind === "link") {
    return part.text || part.href;
  }

  return part.text;
}

function getTextNodeMarks(node: TextNode): CaseInlinePartMarks | undefined {
  const marks: CaseInlinePartMarks = {};

  if (node.hasFormat("bold")) {
    marks.bold = true;
  }

  if (node.hasFormat("underline")) {
    marks.underline = true;
  }

  const styleObject = getStyleObjectFromCSS(node.getStyle());

  if (styleObject["font-size"] === LARGE_TEXT_FONT_SIZE) {
    marks.size = "large";
  } else if (styleObject["font-size"] === SMALL_TEXT_FONT_SIZE) {
    marks.size = "small";
  }

  if (styleObject.color) {
    marks.color = styleObject.color;
  }

  const animation = readComposerAnimation(styleObject);

  if (animation) {
    marks.animation = animation;
  }

  return Object.keys(marks).length > 0 ? marks : undefined;
}

function areMarksEqual(
  left: CaseInlinePartMarks | undefined,
  right: CaseInlinePartMarks | undefined,
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function pushTextPart(
  parts: CaseInlinePart[],
  text: string,
  marks?: CaseInlinePartMarks,
): void {
  if (text.length === 0) {
    return;
  }

  const previousPart = parts.at(-1);

  if (
    previousPart?.kind === "text" &&
    areMarksEqual(previousPart.marks, marks)
  ) {
    previousPart.text += text;
    return;
  }

  parts.push({
    kind: "text",
    marks,
    text,
  });
}

function appendNodeText(
  node: LexicalNode,
  parts: CaseInlinePart[],
  inheritedMarks?: CaseInlinePartMarks,
): void {
  if ($isTextNode(node)) {
    pushTextPart(
      parts,
      node.getTextContent(),
      inheritedMarks ?? getTextNodeMarks(node),
    );
    return;
  }

  if ($isLineBreakNode(node)) {
    pushTextPart(parts, "\n", inheritedMarks);
    return;
  }

  if (!$isElementNode(node)) {
    return;
  }

  node.getChildren().forEach((childNode) => {
    appendNodeText(childNode, parts, inheritedMarks);
  });
}

function splitContentIntoParagraphs(
  content: CaseMessageContent,
): Array<TextSegment[]> {
  const paragraphs: Array<TextSegment[]> = [[]];

  content.parts.forEach((part) => {
    const text = getReadableText(part);
    const lines = text.split("\n");

    lines.forEach((line, index) => {
      if (line.length > 0) {
        paragraphs.at(-1)?.push({
          marks: part.marks,
          text: line,
        });
      }

      if (index < lines.length - 1) {
        paragraphs.push([]);
      }
    });
  });

  return paragraphs.length > 0 ? paragraphs : [[]];
}

function createTextNodeWithMarks(segment: TextSegment): TextNode {
  const textNode = $createTextNode(segment.text);

  if (segment.marks?.bold) {
    textNode.toggleFormat("bold");
  }

  if (segment.marks?.underline) {
    textNode.toggleFormat("underline");
  }

  const styleObject = buildStyleObjectFromMarks(segment.marks);

  if (Object.keys(styleObject).length > 0) {
    textNode.setStyle(toInlineStyleString(styleObject));
  }

  return textNode;
}

function replaceRootWithContent(content: CaseMessageContent): void {
  const root = $getRoot();

  root.getChildren().forEach((child) => {
    child.remove();
  });

  const paragraphs = splitContentIntoParagraphs(content);

  paragraphs.forEach((segments) => {
    const paragraphNode = $createParagraphNode();

    if (segments.length === 0) {
      paragraphNode.append($createTextNode(""));
    } else {
      segments.forEach((segment) => {
        paragraphNode.append(createTextNodeWithMarks(segment));
      });
    }

    root.append(paragraphNode);
  });

  if (root.getChildrenSize() === 0) {
    const paragraphNode = $createParagraphNode();
    paragraphNode.append($createTextNode(""));
    root.append(paragraphNode);
  }

  root.selectEnd();
}

export function createPlainTextCaseMessageContent(
  text: string,
): CaseMessageContent {
  return text.length > 0
    ? {
        parts: [
          {
            kind: "text",
            text,
          },
        ],
      }
    : { parts: [] };
}

export function serializeCaseEditorState(
  editorState: EditorState,
): CaseMessageContent {
  return editorState.read(() => {
    const root = $getRoot();
    const paragraphs = root.getChildren();
    const parts: CaseInlinePart[] = [];

    paragraphs.forEach((paragraphNode, index) => {
      appendNodeText(paragraphNode, parts);

      if (index < paragraphs.length - 1) {
        pushTextPart(parts, "\n");
      }
    });

    return {
      parts,
    };
  });
}

export function setCaseComposerEditorContent(
  editor: LexicalEditor,
  content: CaseMessageContent,
): void {
  editor.update(() => {
    replaceRootWithContent(content);
  });
}

export function initializeCaseComposerEditorState(
  content: CaseMessageContent,
): void {
  replaceRootWithContent(content);
}

export function toCaseComposerBackendMessageContent(editorState: EditorState) {
  return toBackendMessageContent(serializeCaseEditorState(editorState));
}

export function toCaseComposerBackendPlainText(editorState: EditorState) {
  return toBackendPlainText(serializeCaseEditorState(editorState));
}

export function hasMeaningfulCaseMessageContent(
  content: CaseMessageContent,
): boolean {
  return content.parts.some((part) => getReadableText(part).trim().length > 0);
}

export function trimCaseMessageContent(
  content: CaseMessageContent,
): CaseMessageContent {
  const parts = content.parts.map((part) => ({ ...part }));

  if (parts.length === 0) {
    return { parts: [] };
  }

  let startIndex = 0;

  while (startIndex < parts.length) {
    const nextText = getReadableText(parts[startIndex]).trimStart();

    if (nextText.length === 0) {
      startIndex += 1;
      continue;
    }

    parts[startIndex].text = nextText;
    break;
  }

  if (startIndex >= parts.length) {
    return { parts: [] };
  }

  let endIndex = parts.length - 1;

  while (endIndex >= startIndex) {
    const nextText = getReadableText(parts[endIndex]).trimEnd();

    if (nextText.length === 0) {
      endIndex -= 1;
      continue;
    }

    parts[endIndex].text = nextText;
    break;
  }

  return {
    parts: parts.slice(startIndex, endIndex + 1),
  };
}

function readStyleValue(property: string): string {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return "";
  }

  return $getSelectionStyleValueForProperty(selection, property, "").trim();
}

function collectAnimatedComposerElements(
  editor: LexicalEditor,
  animation: ComposerAnimation,
): HTMLElement[] {
  const animatedElements: HTMLElement[] = [];

  editor.getEditorState().read(() => {
    const root = $getRoot();

    const visitNode = (node: LexicalNode) => {
      if (
        $isTextNode(node) &&
        getTextNodeMarks(node)?.animation === animation
      ) {
        const element = editor.getElementByKey(node.getKey());

        if (element) {
          animatedElements.push(element);
        }

        return;
      }

      if (!$isElementNode(node)) {
        return;
      }

      node.getChildren().forEach(visitNode);
    };

    root.getChildren().forEach(visitNode);
  });

  return animatedElements;
}

function replayComposerAnimationOnElement(
  element: HTMLElement,
  animation: ComposerAnimation,
): void {
  element.style.display = "inline-block";
  element.style.animation = "none";
  element.style.transformOrigin = "center";
  void element.offsetHeight;
  element.style.animation = getAnimationStyleValue(animation);
}

function queueComposerAnimationReplay(
  editor: LexicalEditor,
  animation: ComposerAnimation,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    collectAnimatedComposerElements(editor, animation).forEach((element) => {
      replayComposerAnimationOnElement(element, animation);
    });
  });
}

function toggleSelectionStylePatch(
  editor: LexicalEditor,
  options: {
    applyPatch: Record<string, string>;
    clearPatch: Record<string, null>;
    isActive: (currentValue: string) => boolean;
    property: string;
  },
): void {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const currentValue = $getSelectionStyleValueForProperty(
      selection,
      options.property,
      "",
    ).trim();

    $patchStyleText(
      selection,
      options.isActive(currentValue) ? options.clearPatch : options.applyPatch,
    );
  });
}

export function readCaseComposerToolbarState(): CaseComposerToolbarState {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return EMPTY_TOOLBAR_STATE;
  }

  const fontSize = readStyleValue("font-size");
  const color = readStyleValue("color");
  const animation = readStyleValue(CASE_COMPOSER_ANIMATION_STYLE_PROPERTY);

  return {
    activeColor: color.length > 0 ? color : null,
    big: fontSize === LARGE_TEXT_FONT_SIZE,
    bold: selection.hasFormat("bold"),
    color: color.length > 0,
    pulse: animation === "pulse",
    shake: animation === "shake",
    underline: selection.hasFormat("underline"),
  };
}

export function toggleCaseComposerBold(editor: LexicalEditor): void {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
}

export function toggleCaseComposerUnderline(editor: LexicalEditor): void {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
}

export function toggleCaseComposerSize(
  editor: LexicalEditor,
  size: ComposerSize,
): void {
  const nextSize =
    size === "large" ? LARGE_TEXT_FONT_SIZE : SMALL_TEXT_FONT_SIZE;

  toggleSelectionStylePatch(editor, {
    applyPatch: {
      "font-size": nextSize,
    },
    clearPatch: {
      "font-size": null,
    },
    isActive: (currentValue) => currentValue === nextSize,
    property: "font-size",
  });
}

export function toggleCaseComposerColor(editor: LexicalEditor): void {
  toggleSelectionStylePatch(editor, {
    applyPatch: {
      color: CASE_COMPOSER_INLINE_COLOR,
    },
    clearPatch: {
      color: null,
    },
    isActive: (currentValue) => currentValue.length > 0,
    property: "color",
  });
}

export function setCaseComposerColor(
  editor: LexicalEditor,
  colorToken: CaseComposerColorToken,
): void {
  const colorValue = getCaseComposerColorValue(colorToken);

  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    $patchStyleText(selection, {
      color: colorValue,
    });
  });
}

export function toggleCaseComposerAnimation(
  editor: LexicalEditor,
  animation: ComposerAnimation,
): void {
  let replayAnimationOnDisable = false;

  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const currentValue = $getSelectionStyleValueForProperty(
      selection,
      CASE_COMPOSER_ANIMATION_STYLE_PROPERTY,
      "",
    ).trim();
    const isTurningOn = currentValue !== animation;

    $patchStyleText(
      selection,
      isTurningOn
        ? {
            display: "inline-block",
            [CASE_COMPOSER_ANIMATION_STYLE_PROPERTY]: animation,
            animation: getAnimationStyleValue(animation),
            "transform-origin": "center",
          }
        : {
            display: null,
            [CASE_COMPOSER_ANIMATION_STYLE_PROPERTY]: null,
            animation: null,
            "transform-origin": null,
          },
    );

    pendingFirstTypingAnimationReplay.set(
      editor,
      isTurningOn ? animation : null,
    );
    replayAnimationOnDisable = !isTurningOn;
  });

  if (replayAnimationOnDisable) {
    queueComposerAnimationReplay(editor, animation);
  }
}

export function insertCaseComposerMentionTrigger(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    selection.insertText("@");
  });
}

export function registerCaseComposerFormattingShortcuts(
  editor: LexicalEditor,
): () => void {
  let pendingAnimationReplay: ComposerAnimation | null = null;

  return mergeRegister(
    editor.registerUpdateListener(() => {
      if (!pendingAnimationReplay) {
        return;
      }

      const animationToReplay = pendingAnimationReplay;
      pendingAnimationReplay = null;
      queueComposerAnimationReplay(editor, animationToReplay);
    }),
    editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const isModifierPressed = event.metaKey || event.ctrlKey;

        if (!isModifierPressed) {
          const pendingTypingAnimation =
            pendingFirstTypingAnimationReplay.get(editor) ?? null;

          if (
            pendingTypingAnimation &&
            event.key.length === 1 &&
            !event.altKey
          ) {
            pendingAnimationReplay = pendingTypingAnimation;
            pendingFirstTypingAnimationReplay.set(editor, null);
          }

          return false;
        }

        if (event.key.toLowerCase() === "b") {
          toggleCaseComposerBold(editor);
          return true;
        }

        if (event.key.toLowerCase() === "u") {
          toggleCaseComposerUnderline(editor);
          return true;
        }

        if (!event.shiftKey) {
          return false;
        }

        if (event.key === ">" || event.key === ".") {
          event.preventDefault();
          toggleCaseComposerSize(editor, "large");
          return true;
        }

        if (event.key === "<" || event.key === ",") {
          event.preventDefault();
          toggleCaseComposerSize(editor, "small");
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
}

export function getCaseComposerSizeStyle(
  size: ComposerSize | undefined,
): string {
  if (size === "large") {
    return LARGE_TEXT_STYLE;
  }

  if (size === "small") {
    return SMALL_TEXT_STYLE;
  }

  return "";
}
