import { lazy, Suspense } from "react";
import { Plus, SendHorizontal } from "lucide-react";
import { m } from "framer-motion";

import { useCaseConversationContext } from "../../providers/CaseConversationProvider";
import {
  CASE_RICH_TEXT_TEST_IDS,
  hasMeaningfulCaseMessageContent,
} from "../../lib/case-lexical-serialization";

const LazyCaseComposerEditor = lazy(() =>
  import("./CaseComposerEditor").then((module) => ({
    default: module.CaseComposerEditor,
  })),
);

export function CaseRichComposer(): React.JSX.Element {
  const controller = useCaseConversationContext();
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

        <div className="flex items-end gap-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
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
                disabled={
                  isEditing ? controller.isSubmittingEdit : controller.isSending
                }
                onChange={({ content, plainText }) => {
                  if (isEditing) {
                    controller.setEditingComposerContent(content, plainText);
                    return;
                  }

                  controller.setComposerContent(content, plainText);
                }}
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
  );
}
