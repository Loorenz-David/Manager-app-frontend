import { $patchStyleText } from "@lexical/selection";
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
} from "lexical";

import type {
  CaseInlinePart,
  CaseInlinePartMarks,
  CaseMessageContent,
} from "../message-content";
import {
  toBackendMessageContent,
  toBackendPlainText,
} from "./message-content-adapter";

const LARGE_TEXT_STYLE = "font-size: 1.125rem;";
const SMALL_TEXT_STYLE = "font-size: 0.875rem;";

export const CASE_RICH_TEXT_TEST_IDS = {
  composer: "case-rich-composer",
  editor: "case-rich-composer-editor",
} as const;

type TextSegment = {
  marks?: CaseInlinePartMarks;
  text: string;
};

type ComposerSize = NonNullable<CaseInlinePartMarks["size"]>;

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

  const style = node.getStyle();

  if (style.includes("font-size: 1.125rem")) {
    marks.size = "large";
  } else if (style.includes("font-size: 0.875rem")) {
    marks.size = "small";
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
    pushTextPart(parts, node.getTextContent(), inheritedMarks ?? getTextNodeMarks(node));
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

  if (segment.marks?.size === "large") {
    textNode.setStyle(LARGE_TEXT_STYLE);
  } else if (segment.marks?.size === "small") {
    textNode.setStyle(SMALL_TEXT_STYLE);
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

export function toCaseComposerBackendMessageContent(
  editorState: EditorState,
) {
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

export function registerCaseComposerFormattingShortcuts(
  editor: LexicalEditor,
): () => void {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed) {
        return false;
      }

      if (event.key.toLowerCase() === "b") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        return true;
      }

      if (event.key.toLowerCase() === "u") {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        return true;
      }

      if (!event.shiftKey) {
        return false;
      }

      if (event.key === ">" || event.key === ".") {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, { "font-size": "1.125rem" });
          }
        });
        return true;
      }

      if (event.key === "<" || event.key === ",") {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, { "font-size": "0.875rem" });
          }
        });
        return true;
      }

      return false;
    },
    COMMAND_PRIORITY_LOW,
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
