import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Camera, Check } from "lucide-react";

import {
  CaseComposerToolbar,
  blurActiveComposerElement,
  getCaseComposerColorToken,
  type CaseComposerColorToken,
  type CaseComposerEditorToolbarActions,
  type CaseComposerToolbarState,
  type CaseMessageContent,
} from "@beyo/cases";
import { cn, type RichTextContent } from "@beyo/lib";
import {
  preloadImageCameraSurface,
  useEntityImagesContext,
} from "@beyo/images";
import { useKeyboardInset } from "@beyo/ui";

import type { TaskNoteComposerValue } from "../types";

const LazyCaseComposerEditor = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CaseComposerEditor,
  })),
);

const EMPTY_TOOLBAR_STATE: CaseComposerToolbarState = {
  activeColor: null,
  big: false,
  bold: false,
  color: false,
  pulse: false,
  shake: false,
  underline: false,
};

const EMPTY_CONTENT: RichTextContent = {
  parts: [],
};

type CaseComposerExpandedTool = "color";

type TaskNoteComposerProps = {
  disabled?: boolean;
  initialContent?: RichTextContent;
  onChange: (value: TaskNoteComposerValue) => void;
  onCheckDone?: () => void;
  placeholder?: string;
  testId?: string;
};

export function TaskNoteComposer({
  disabled = false,
  initialContent,
  onChange,
  onCheckDone,
  placeholder = "Add a note…",
  testId = "task-note-composer",
}: TaskNoteComposerProps): React.JSX.Element {
  const { openCamera } = useEntityImagesContext();
  const { isKeyboardOpen } = useKeyboardInset();
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [toolbarActions, setToolbarActions] =
    useState<CaseComposerEditorToolbarActions | null>(null);
  const [toolbarState, setToolbarState] =
    useState<CaseComposerToolbarState>(EMPTY_TOOLBAR_STATE);
  const [expandedTool, setExpandedTool] =
    useState<CaseComposerExpandedTool | null>(null);
  const [pulsePreviewTick, setPulsePreviewTick] = useState(0);
  const [shakePreviewTick, setShakePreviewTick] = useState(0);
  const composerRootRef = useRef<HTMLDivElement | null>(null);
  const [floatingHeight, setFloatingHeight] = useState<number | null>(null);
  const [floatStyle, setFloatStyle] = useState<React.CSSProperties | null>(null);
  const shouldFloat = isEditorFocused && isKeyboardOpen;
  const shouldFloatRef = useRef(shouldFloat);
  shouldFloatRef.current = shouldFloat;

  const handleToolbarActionsReady = useCallback(
    (nextActions: CaseComposerEditorToolbarActions | null) => {
      setToolbarActions(nextActions);

      if (nextActions === null) {
        setExpandedTool(null);
        setToolbarState(EMPTY_TOOLBAR_STATE);
      }
    },
    [],
  );

  const handleExpandedColorSelect = useCallback(
    (colorToken: CaseComposerColorToken) => {
      toolbarActions?.applyColor(colorToken);
    },
    [toolbarActions],
  );

  const handleExpandedToolCollapse = useCallback(() => {
    toolbarActions?.applyColor("default");
    setExpandedTool(null);
  }, [toolbarActions]);

  const handleEditorFocus = useCallback(() => {
    setIsEditorFocused(true);
  }, []);

  const handleEditorBlur = useCallback(() => {
    setIsEditorFocused(false);
    setExpandedTool(null);
  }, []);

  useLayoutEffect(() => {
    const root = composerRootRef.current;

    if (!root) {
      return;
    }

    const measure = () => {
      // Only capture the inline height. While floating, the root becomes a
      // full-screen fixed panel, so measuring it would reserve the whole screen
      // as a spacer instead of the composer's resting height.
      if (shouldFloatRef.current) {
        return;
      }

      setFloatingHeight(root.getBoundingClientRect().height);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!shouldFloat) {
      setFloatStyle(null);
      return;
    }

    const root = composerRootRef.current;
    if (!root) {
      return;
    }

    // `position: fixed` normally resolves against the viewport, but an ancestor
    // with transform / filter / perspective / will-change / contain establishes
    // a new containing block. The bottom-sheet wrapper uses `will-change:
    // transform`, so a plain `fixed inset-0` panel collapses onto the sheet's
    // box instead of taking over the screen. We locate that containing block and
    // compensate for its offset so the panel covers the real viewport region
    // above the keyboard on both the slide and sheet surfaces.
    const findFixedContainingBlock = (): HTMLElement | null => {
      let node = root.parentElement;
      while (
        node &&
        node !== document.body &&
        node !== document.documentElement
      ) {
        const style = getComputedStyle(node);
        const establishesContainingBlock =
          style.transform !== "none" ||
          style.filter !== "none" ||
          style.perspective !== "none" ||
          /transform|filter|perspective/.test(style.willChange) ||
          /paint|layout|strict|content/.test(style.contain);

        if (establishesContainingBlock) {
          return node;
        }

        node = node.parentElement;
      }

      return null;
    };

    const compute = (): void => {
      const keyboardInset =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--keyboard-inset",
          ),
        ) || 0;
      const keyboardTop = window.innerHeight - keyboardInset;
      const origin = findFixedContainingBlock()?.getBoundingClientRect();

      // Anchor to the containing block's BOTTOM, not its top: the sheet is
      // bottom-pinned above the keyboard, so its bottom edge stays put even as
      // it reflows when the panel leaves the flow, whereas its top edge shifts.
      // `bottom` + `height` places the panel from the viewport top down to the
      // keyboard, correctly on both the slide (viewport) and sheet surfaces.
      const originBottom = origin?.bottom ?? window.innerHeight;
      const originLeft = origin?.left ?? 0;

      setFloatStyle({
        position: "fixed",
        bottom: originBottom - keyboardTop,
        height: keyboardTop,
        left: -originLeft,
        width: window.innerWidth,
      });
    };

    compute();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", compute);
    viewport?.addEventListener("scroll", compute);
    window.addEventListener("resize", compute);

    return () => {
      viewport?.removeEventListener("resize", compute);
      viewport?.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [shouldFloat]);

  const toolbarButtonActions = {
    big: () => {
      toolbarActions?.toggleBig();
    },
    bold: () => {
      toolbarActions?.toggleBold();
    },
    color: () => {
      setExpandedTool("color");
    },
    mention: () => {
      toolbarActions?.openMentionPicker();
    },
    pulse: () => {
      toolbarActions?.togglePulse();
      setPulsePreviewTick((currentValue) => currentValue + 1);
    },
    shake: () => {
      toolbarActions?.toggleShake();
      setShakePreviewTick((currentValue) => currentValue + 1);
    },
    underline: () => {
      toolbarActions?.toggleUnderline();
    },
  } satisfies Record<
    "big" | "bold" | "color" | "mention" | "pulse" | "shake" | "underline",
    () => void
  >;

  return (
    <div
      data-testid={testId}
      style={
        shouldFloat && floatingHeight ? { height: floatingHeight } : undefined
      }
    >
      <div
        ref={composerRootRef}
        className={cn(
          shouldFloat
            ? "z-[9999] flex flex-col overflow-hidden overscroll-contain bg-card px-4 pb-3 pt-[max(var(--safe-top),1.75rem)]"
            : null,
        )}
        style={shouldFloat ? (floatStyle ?? undefined) : undefined}
      >
        <div
          className={cn(
            "rounded-2xl border border-border bg-card px-2 py-2 shadow-sm",
            shouldFloat && "flex h-[250px] flex-col",
          )}
        >
          <div
            className={cn(
              "flex items-end gap-2",
              shouldFloat && "min-h-0 flex-1",
            )}
          >
            <div
              className={cn(
                "relative min-w-0 flex-1 rounded-[1.35rem] bg-card",
                shouldFloat && "min-h-0 self-stretch",
              )}
            >
              <Suspense
                fallback={
                  <div className="min-h-16 px-3 py-2 text-base text-muted-foreground">
                    Loading composer...
                  </div>
                }
              >
                <LazyCaseComposerEditor
                  className={cn(
                    "min-h-16",
                    shouldFloat && "h-full max-h-none overscroll-y-contain",
                  )}
                  content={
                    (initialContent ??
                      EMPTY_CONTENT) as unknown as CaseMessageContent
                  }
                  disabled={disabled}
                  onBlur={handleEditorBlur}
                  onChange={({ content, plainText }) => {
                    onChange({ content, plainText });
                  }}
                  onFocus={handleEditorFocus}
                  onToolbarActionsReady={handleToolbarActionsReady}
                  onToolbarStateChange={setToolbarState}
                  placeholder={placeholder}
                />
              </Suspense>
            </div>

            {!isEditorFocused ? (
              <button
                aria-label="Take picture"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                data-testid="task-note-composer-camera-button"
                disabled={disabled}
                onClick={() => {
                  blurActiveComposerElement();
                  openCamera();
                }}
                onFocus={() => {
                  void preloadImageCameraSurface();
                }}
                onMouseDown={(e) => e.preventDefault()}
                onPointerEnter={() => {
                  void preloadImageCameraSurface();
                }}
                onTouchStart={() => {
                  void preloadImageCameraSurface();
                }}
                type="button"
              >
                <Camera aria-hidden="true" className="size-5" />
              </button>
            ) : (
              <button
                aria-label="Done"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
                data-testid="task-note-composer-done-button"
                disabled={disabled}
                onClick={() => {
                  blurActiveComposerElement();
                  onCheckDone?.();
                }}
                onMouseDown={(e) => e.preventDefault()}
                type="button"
              >
                <Check aria-hidden="true" className="size-5 text-card" />
              </button>
            )}
          </div>
        </div>

        {isEditorFocused ? (
          <div
            className="mt-2 rounded-[1.9rem]  px-2 py-1 "
            onMouseDown={(e) => e.preventDefault()}
          >
            <CaseComposerToolbar
              actions={toolbarButtonActions}
              disabled={disabled || toolbarActions === null}
              expandedColorToken={getCaseComposerColorToken(
                toolbarState.activeColor,
              )}
              expandedTool={expandedTool}
              onCollapseExpandedTool={handleExpandedToolCollapse}
              onSelectExpandedColor={handleExpandedColorSelect}
              pulsePreviewTick={pulsePreviewTick}
              shakePreviewTick={shakePreviewTick}
              state={toolbarState}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
