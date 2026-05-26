import TextareaAutosize from "react-textarea-autosize";

import { useCaseConversationContext } from "../../providers/CaseConversationProvider";

export function CaseBasicComposer(): React.JSX.Element {
  const controller = useCaseConversationContext();
  const isSendDisabled =
    controller.draftText.trim().length === 0 || controller.isSending;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 bg-background shadow-[0_-1px_0_0_var(--color-border)]"
      data-testid="case-composer"
    >
      <div className="px-4 pb-[calc(var(--safe-bottom,0px)+1rem)] pt-3">
        {controller.sendError ? (
          <div
            className="mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            data-testid="case-composer-error"
          >
            <span className="min-w-0 flex-1">
              {controller.sendError.message}
            </span>
            <button
              className="shrink-0 rounded-full border border-destructive/30 px-3 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSendDisabled}
              onClick={() => {
                void controller.sendDraft();
              }}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 rounded-[1.75rem] border border-border bg-card shadow-sm transition-colors duration-150 focus-within:border-primary/40">
            <TextareaAutosize
              className="max-h-32 w-full resize-none bg-transparent px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              data-testid="case-composer-textarea"
              disabled={controller.isSending}
              maxRows={4}
              minRows={1}
              onChange={(event) => {
                controller.setDraftText(event.target.value);
              }}
              placeholder="Write a message"
              value={controller.draftText}
            />
          </div>
          <button
            className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-[color:var(--color-card)] shadow-sm transition-all duration-150 hover:opacity-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            data-testid="case-composer-send-button"
            disabled={isSendDisabled}
            onClick={() => {
              void controller.sendDraft();
            }}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
