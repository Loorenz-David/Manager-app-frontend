import { CirclePause, Coffee, Hammer, Moon } from "lucide-react";
import { BackendImage, TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { useHomeTopCardsContext } from "../providers/HomeTopCardsProvider";
import { preloadWorkerStateSheetSurface } from "../surfaces";
import type { WorkerStateIconKind } from "../controllers/use-home-top-cards.controller";

const STATE_ICON: Record<
  WorkerStateIconKind,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  working: Hammer,
  idle: Coffee,
  paused: CirclePause,
  not_clocked_in: Moon,
};

export function WorkerStateCard(): React.JSX.Element | null {
  usePreloadSurface(preloadWorkerStateSheetSurface);

  const {
    showStateCard,
    stateCard,
    isStateCardPending,
    isStateCardError,
    canOpenStatePicker,
    openStatePicker,
  } = useHomeTopCardsContext();

  if (!showStateCard) {
    return null;
  }

  // `min-w-0` on every root: the card is a grid item sharing a row with the
  // Re-Assigned card, and a grid item's default `min-width: auto` lets it
  // overflow its track — without this the labels below never truncate, they
  // widen the row instead. The column width itself comes from the `1fr` track,
  // so all roots stay the same width in every state.
  if (isStateCardPending) {
    return (
      <div
        aria-busy="true"
        className="skeleton-shimmer h-[68px] min-w-0 rounded-2xl"
        data-testid="worker-state-card-loading"
      />
    );
  }

  if (isStateCardError || !stateCard) {
    return (
      <div
        className="min-w-0 truncate rounded-2xl bg-card px-4 py-4 text-sm text-muted-foreground shadow-sm border-soft-container"
        data-testid="worker-state-card-error"
        title="Shift state unavailable"
      >
        Shift state unavailable
      </div>
    );
  }

  const Icon = STATE_ICON[stateCard.iconKind];

  return (
    <button
      className="flex min-w-0 items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-sm transition-opacity border-soft-container disabled:cursor-default"
      data-testid="worker-state-card"
      data-state={stateCard.iconKind}
      disabled={!canOpenStatePicker}
      type="button"
      onClick={openStatePicker}
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-soft-container)]">
        {stateCard.imageUrl ? (
          <BackendImage
            className="size-full object-cover"
            fallback={
              <Icon aria-hidden className="size-5 text-muted-foreground" />
            }
            src={stateCard.imageUrl}
          />
        ) : (
          <Icon aria-hidden className="size-5 text-muted-foreground" />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="truncate text-sm font-semibold text-foreground"
          data-testid="worker-state-card-label"
          // Pause-reason names are workspace-authored and can be long; keep the
          // full text reachable once the visible label is clipped.
          title={stateCard.label}
        >
          {stateCard.label}
        </span>
        {stateCard.timerStartedAtIso ? (
          <TickingTimer
            className="font-mono text-xs text-muted-foreground"
            data-testid="worker-state-card-timer"
            startedAtIso={stateCard.timerStartedAtIso}
          />
        ) : null}
      </span>
    </button>
  );
}
