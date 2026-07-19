import { memo } from "react";
import { Check, ShoppingBag, TriangleAlert } from "lucide-react";

import { TASK_TYPE_ICON } from "@beyo/tasks";
import { BackendImage, ImagePlaceholder, TickingTimer } from "@beyo/ui";

import { STATE_CHIP_CLASS } from "../lib/state-pill-styles";
import type { WorkerDailyStepCardViewModel } from "../lib/worker-daily-step-dto";

export type WorkerStatsGranularityCardProps = {
  card: WorkerDailyStepCardViewModel;
  onTapImage?: (card: WorkerDailyStepCardViewModel) => void;
  onTapCard?: (taskId: string) => void;
};

export const WorkerStatsGranularityCard = memo(
  function WorkerStatsGranularityCard({
    card,
    onTapImage,
    onTapCard,
  }: WorkerStatsGranularityCardProps): React.JSX.Element {
    const TypeIcon =
      (card.taskType ? TASK_TYPE_ICON[card.taskType] : null) ?? ShoppingBag;
    const chipClass = STATE_CHIP_CLASS[card.stateVariant];
    const canTapImage = Boolean(onTapImage) && card.images.length > 0;
    const canTapBody = Boolean(onTapCard);

    return (
      <div
        className="flex overflow-hidden rounded-2xl bg-card shadow-sm"
        data-testid={`worker-granularity-card-${card.stepId}`}
      >
        <button
          aria-label={canTapImage ? "View item image" : undefined}
          className={`relative aspect-square w-28 shrink-0 overflow-hidden bg-muted ${
            canTapImage ? "cursor-pointer" : "cursor-default"
          }`}
          data-testid={`worker-granularity-card-image-${card.stepId}`}
          disabled={!canTapImage}
          type="button"
          onClick={() => onTapImage?.(card)}
        >
          <BackendImage
            className="size-full object-cover"
            fallback={
              <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
            }
            src={card.imageUrl}
          />

          {card.quantityLabel ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
              {card.quantityLabel}
            </span>
          ) : null}
        </button>

        <div
          className={`flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 ${
            canTapBody ? "cursor-pointer" : "cursor-default"
          }`}
          data-testid={`worker-granularity-card-body-${card.stepId}`}
          role={canTapBody ? "button" : undefined}
          tabIndex={canTapBody ? 0 : undefined}
          onClick={() => onTapCard?.(card.taskId)}
          onKeyDown={(event) => {
            if (!canTapBody) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onTapCard?.(card.taskId);
            }
          }}
        >
          <span className="min-w-0 truncate text-sm font-bold tracking-tight text-foreground">
            {card.articleLabel}
          </span>

          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate font-medium">
              {card.typeLabel}
              {card.detailLabel ? ` · ${card.detailLabel}` : ""}
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${chipClass}`}
              data-testid={`worker-granularity-card-time-${card.stepId}`}
            >
              {card.intention === "completed" ? (
                <Check aria-hidden="true" className="size-4 shrink-0" />
              ) : null}
              <span>{card.stateLabel}</span>
              {card.time.kind === "ticking" ? (
                <TickingTimer
                  className="font-mono tabular-nums font-normal"
                  data-testid={`worker-granularity-card-timer-${card.stepId}`}
                  offsetSeconds={card.time.offsetSeconds}
                  ratePerSecond={card.time.ratePerSecond}
                  startedAtIso={card.time.startedAtIso}
                />
              ) : (
                <span className="font-mono tabular-nums font-normal">
                  {card.time.text}
                </span>
              )}
            </div>

            {/* Inaccurate-timing flag. Label follows what was actually applied:
                "Estimated" when a fill was added, "Flagged" when the shown time
                is trusted-only (fill mode off, or a suppressed thin estimate). */}
            {card.inaccurateBadgeLabel ? (
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_CHIP_CLASS.warning}`}
                data-testid={`worker-granularity-card-inaccurate-${card.stepId}`}
              >
                <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                <span>{card.inaccurateBadgeLabel}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);
