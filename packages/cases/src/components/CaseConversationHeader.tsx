import { ChevronLeft, Info } from "lucide-react";

import { useCaseConversationContext } from "../providers/CaseConversationProvider";

export function CaseConversationHeader(): React.JSX.Element {
  const controller = useCaseConversationContext();

  return (
    <header
      className="relative z-30 border-b border-border bg-background"
      data-testid="case-conversation-header"
    >
      <div className="flex min-h-20 items-center gap-3  py-3">
        <button
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-full  text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="case-conversation-back-button"
          onClick={controller.closeConversation}
          type="button"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-lg font-semibold text-foreground"
            data-testid="case-conversation-primary-label"
          >
            {controller.primaryLabel}
          </p>
          <p
            className="truncate text-xs text-muted-foreground"
            data-testid="case-conversation-subtitle"
          >
            {controller.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Open info"
            className="flex size-8 items-center justify-center rounded-lg border border-light-border bg-card px-2 text-foreground shadow-sm transition-colors duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="case-conversation-info-button"
            disabled={!controller.canOpenInfo}
            onClick={controller.openInfo}
            type="button"
          >
            <Info className="size-4" />
          </button>

          {controller.stateActionLabel ? (
            <button
              className="mr-3 inline-flex min-h-8 items-center justify-center rounded-lg border border-light-border bg-card px-4 py-1 text-sm font-semibold text-primary shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="case-conversation-state-button"
              disabled={controller.isAdvancingState}
              onClick={() => {
                void controller.advanceState();
              }}
              type="button"
            >
              {controller.stateActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
