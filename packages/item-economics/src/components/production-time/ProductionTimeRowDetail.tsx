import { cn } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

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
 * The active row's pressure-based position and progress. Remaining/overflow
 * arithmetic is presentational; the semantic verdict still comes from the
 * backend and is rendered unchanged apart from display wording.
 */
export function ProductionTimeRowDetail({
  detail,
  metrics,
}: ProductionTimeRowDetailProps): React.JSX.Element {
  const isOverShare = detail.verdictTone === "over_share";

  return (
    <div className="flex flex-col gap-3" data-testid="production-time-row-detail">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            detail.positionTone === "over" && PRODUCTION_TIME_DANGER_TEXT,
          )}
          data-testid="production-time-row-position"
        >
          {detail.positionLabel}
        </span>
        <span data-testid="production-time-row-verdict">
          <StatePill
            className="rounded-lg px-2.5 py-1 text-xs"
            label={detail.verdictLabel}
            variant={isOverShare ? "danger" : "success"}
          />
        </span>
      </div>

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
