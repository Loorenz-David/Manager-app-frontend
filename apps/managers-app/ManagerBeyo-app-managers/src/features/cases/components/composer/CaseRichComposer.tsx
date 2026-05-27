import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Plus, SendHorizontal } from "lucide-react";
import { m } from "framer-motion";

import {
  getCaseComposerColorToken,
  type CaseComposerColorToken,
} from "./CaseColorPalette";
import { CaseComposerToolbar } from "./CaseComposerToolbar";
import type { CaseComposerEditorToolbarActions } from "./CaseComposerEditor";
import { useCaseConversationContext } from "../../providers/CaseConversationProvider";
import {
  CASE_RICH_TEXT_TEST_IDS,
  hasMeaningfulCaseMessageContent,
  type CaseComposerToolbarState,
} from "../../lib/case-lexical-serialization";

const LazyCaseComposerEditor = lazy(() =>
  import("./CaseComposerEditor").then((module) => ({
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

type CaseComposerExpandedTool = "color";

type CaseRichComposerProps = {
  onToolbarVisibilityChange?: (isVisible: boolean) => void;
};

export function CaseRichComposer({
  onToolbarVisibilityChange,
}: CaseRichComposerProps): React.JSX.Element {
  const controller = useCaseConversationContext();
  const [pulsePreviewTick, setPulsePreviewTick] = useState(0);
  const [shakePreviewTick, setShakePreviewTick] = useState(0);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [toolbarActions, setToolbarActions] =
    useState<CaseComposerEditorToolbarActions | null>(null);
  const [toolbarState, setToolbarState] =
    useState<CaseComposerToolbarState>(EMPTY_TOOLBAR_STATE);
  const [expandedTool, setExpandedTool] =
    useState<CaseComposerExpandedTool | null>(null);
  const isEditing = controller.editingMessageId !== null;
  const composerContent = isEditing
    ? controller.editingComposerContent
    : controller.composerContent;
  const composerError = isEditing ? controller.editError : controller.sendError;
  const composerPlaceholder = isEditing
    ? "Edit your message"
    : "Write a message";
  const isSendDisabled =
    !hasMeaningfulCaseMessageContent(controller.composerContent) ||
    controller.isSending;
  const isEditDisabled =
    !hasMeaningfulCaseMessageContent(controller.editingComposerContent) ||
    controller.isSubmittingEdit;
  const isComposerDisabled = isEditing
    ? controller.isSubmittingEdit
    : controller.isSending;
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

  useEffect(() => {
    onToolbarVisibilityChange?.(isEditorFocused);
  }, [isEditorFocused, onToolbarVisibilityChange]);

  // On mobile, scrolling dismisses the keyboard but never fires a blur event on
  // the contenteditable. Detect keyboard dismissal via visualViewport height
  // growing and treat it as a blur.
  useEffect(() => {
    if (!isEditorFocused || !window.visualViewport) {
      return;
    }

    let lastHeight = window.visualViewport.height;

    const handleViewportResize = () => {
      const currentHeight = window.visualViewport!.height;

      if (currentHeight > lastHeight) {
        (document.activeElement as HTMLElement | null)?.blur();
      }

      lastHeight = currentHeight;
    };

    window.visualViewport.addEventListener("resize", handleViewportResize);

    return () => {
      window.visualViewport!.removeEventListener("resize", handleViewportResize);
    };
  }, [isEditorFocused]);

  useEffect(
    () => () => {
      onToolbarVisibilityChange?.(false);
    },
    [onToolbarVisibilityChange],
  );

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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
      data-testid="case-composer"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom,0)+3.4rem)] bg-background"
      />

      <div
        className="pointer-events-auto relative z-10 px-4 pb-[calc(var(--safe-bottom,0)+0.8rem)] pt-2"
        data-testid={CASE_RICH_TEXT_TEST_IDS.composer}
      >
        {controller.typingIndicatorText ? (
          <div
            className="mb-2 flex items-center gap-1.5 pl-3 text-xs font-medium text-primary"
            data-testid="case-conversation-typing-indicator"
          >
            <span>{controller.typingIndicatorText}</span>
            <div className="flex items-end gap-1">
              {[0, 1, 2].map((index) => (
                <m.span
                  key={index}
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  className="size-1.5 rounded-full bg-primary"
                  transition={{
                    delay: index * 0.12,
                    duration: 0.75,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {isEditing ? (
          <div
            className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-2.5 text-sm text-foreground"
            data-testid="case-composer-edit-mode"
          >
            <span className="min-w-0 flex-1 font-medium">Editing message</span>
            <button
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-muted"
              onClick={controller.cancelEditing}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {composerError ? (
          <div
            className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
            data-testid="case-composer-error"
          >
            <span className="min-w-0 flex-1">{composerError.message}</span>
            <button
              className="shrink-0 rounded-full border border-destructive/30 px-3 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isEditing ? isEditDisabled : isSendDisabled}
              onClick={() => {
                if (isEditing) {
                  void controller.submitEdit();
                  return;
                }

                void controller.sendDraft();
              }}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}

        {isEditorFocused ? (
          <div className="mb-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
            <CaseComposerToolbar
              actions={toolbarButtonActions}
              disabled={isComposerDisabled || toolbarActions === null}
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

        <div className="rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-end gap-2">
            {!isEditing ? (
              <button
                aria-label="Open composer actions"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                type="button"
              >
                <Plus className="size-5" />
              </button>
            ) : null}

            <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
              <Suspense
                fallback={
                  <div className="min-h-9 px-3 py-2 text-base text-muted-foreground">
                    Loading composer...
                  </div>
                }
              >
                <LazyCaseComposerEditor
                  content={composerContent}
                  disabled={isComposerDisabled}
                  onBlur={handleEditorBlur}
                  onChange={({ content, plainText }) => {
                    if (isEditing) {
                      controller.setEditingComposerContent(content, plainText);
                      return;
                    }

                    controller.setComposerContent(content, plainText);
                  }}
                  onFocus={handleEditorFocus}
                  onToolbarActionsReady={handleToolbarActionsReady}
                  onToolbarStateChange={setToolbarState}
                  placeholder={composerPlaceholder}
                />
              </Suspense>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-1.5 pr-0.5">
                <button
                  className="rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-muted"
                  onClick={controller.cancelEditing}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-card transition-all duration-150 hover:opacity-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  data-testid="case-composer-save-button"
                  disabled={isEditDisabled}
                  onClick={() => {
                    void controller.submitEdit();
                  }}
                  type="button"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                aria-label="Send message"
                className="mr-0.5 self-end flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-card transition-all duration-150 hover:opacity-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                data-testid="case-composer-send-button"
                disabled={isSendDisabled}
                onClick={() => {
                  void controller.sendDraft();
                }}
                type="button"
              >
                <SendHorizontal className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
