import { ChevronLeft, Info } from 'lucide-react';

import { useCaseConversationContext } from '../providers/CaseConversationProvider';

export function CaseConversationHeader(): React.JSX.Element {
  const controller = useCaseConversationContext();

  return (
    <header
      className="fixed inset-x-0 top-[var(--safe-top)] z-30 border-b border-border bg-background"
      data-testid="case-conversation-header"
    >
      <div className="flex min-h-20 items-center gap-3 px-4 py-3">
        <button
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="case-conversation-back-button"
          onClick={controller.closeConversation}
          type="button"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground"
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
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="case-conversation-info-button"
            disabled={!controller.canOpenInfo}
            onClick={controller.openInfo}
            type="button"
          >
            <Info className="size-4" />
          </button>

          {controller.stateActionLabel ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-card transition disabled:cursor-not-allowed disabled:opacity-60"
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
