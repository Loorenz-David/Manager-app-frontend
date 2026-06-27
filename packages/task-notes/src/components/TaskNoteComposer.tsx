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
  const shouldFloat = isEditorFocused && isKeyboardOpen;

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
      setFloatingHeight(root.getBoundingClientRect().height);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

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
      style={shouldFloat && floatingHeight ? { height: floatingHeight } : undefined}
    >
      <div
        ref={composerRootRef}
        className={cn(
          shouldFloat
            ? "fixed inset-x-0 bottom-[var(--keyboard-inset)] z-[9999] border-t border-border bg-card px-4 pb-[calc(var(--safe-bottom)_+_0.5rem)] pt-3 shadow-xl"
            : null,
        )}
      >
        {isEditorFocused ? (
          <div
            className="mb-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
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

        <div className="rounded-2xl border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
              <Suspense
                fallback={
                  <div className="min-h-16 px-3 py-2 text-base text-muted-foreground">
                    Loading composer...
                  </div>
                }
              >
                <LazyCaseComposerEditor
                  className="min-h-16"
                  content={(initialContent ?? EMPTY_CONTENT) as unknown as CaseMessageContent}
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
      </div>
    </div>
  );
}
