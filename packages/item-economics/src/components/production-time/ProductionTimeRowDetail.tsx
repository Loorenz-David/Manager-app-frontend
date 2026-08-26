import { cn } from "@beyo/lib";

import {
  type ProductionTimeRowDetailViewModel,
  type ProductionTimeRowMetricsViewModel,
} from "../../lib/production-time-view-model";
import { ProductionTimeMetrics } from "./ProductionTimeMetrics";
import {
  PRODUCTION_TIME_DANGER_TEXT,
  PRODUCTION_TIME_TONE_FILL,
} from "./production-time-tone";

export type ProductionTimeRowDetailProps = {
  detail: ProductionTimeRowDetailViewModel;
  metrics: ProductionTimeRowMetricsViewModel;
};

/**
 * The active row's pressure-based position and progress. On-track rows show
 * the remaining time; over-budget rows omit that line because their overrun is
 * already present in the metric grid. The backend verdict owns that choice and
 * the bar and metric tones.
 */
export function ProductionTimeRowDetail({
  detail,
  metrics,
}: ProductionTimeRowDetailProps): React.JSX.Element {
  const isOverShare = detail.verdictTone === "over_share";

  return (
    <div className="flex flex-col gap-3" data-testid="production-time-row-detail">
      {!isOverShare ? (
        <span
          className={cn(
            "self-end text-sm font-medium tabular-nums",
            detail.positionTone === "over" && PRODUCTION_TIME_DANGER_TEXT,
          )}
          data-testid="production-time-row-position"
        >
          {detail.positionLabel}
        </span>
      ) : null}

      <div
        aria-hidden="true"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40"
        data-testid="production-time-row-progress"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${detail.progressPercent}%`,
            backgroundColor: isOverShare
              ? PRODUCTION_TIME_TONE_FILL.blocked
              : PRODUCTION_TIME_TONE_FILL.working,
          }}
        />
      </div>
      <ProductionTimeMetrics metrics={metrics} />
    </div>
  );
}
