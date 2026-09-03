import { cn } from "@beyo/lib";

import {
  buildBudgetLine,
  formatPassCount,
  type ProductionTimeRowViewModel,
} from "../../lib/production-time-view-model";
import { ProductionTimeRowDetail } from "./ProductionTimeRowDetail";
import { ProductionTimeMetrics } from "./ProductionTimeMetrics";
import {
  PRODUCTION_TIME_ACTIVE_ROW_ACCENT,
  PRODUCTION_TIME_ACTIVE_ROW_BG,
  PRODUCTION_TIME_TONE_FILL,
} from "./production-time-tone";

export type ProductionTimeRowProps = {
  row: ProductionTimeRowViewModel;
  /**
   * The degraded, budget-less card adds the typical comparison —
   * "Sanding · 25m of typically 50m" — which is the one case where the display
   * is driven by the typical rather than an allowance.
   */
  showTypicalComparison?: boolean;
};

export function ProductionTimeRow({
  row,
  showTypicalComparison = false,
}: ProductionTimeRowProps): React.JSX.Element {
  const comparison = showTypicalComparison ? row.typicalComparisonLabel : null;
  const passCount = formatPassCount(row.stepCount);
  const metrics = row.terminalMetrics ?? row.activeMetrics;
  const typicalMetric = metrics?.[2] ?? null;
  // Active and terminal rows use structured metrics. The entire compact
  // fallback line is irrelevant without a valuation: typical already belongs
  // in the header, and pressure has no actionable meaning in that state.
  const budgetLine =
    showTypicalComparison ||
    row.detail ||
    row.terminalMetrics ||
    row.activeMetrics
    ? null
    : buildBudgetLine(row.allowanceLabel, row.pressureLabel, row.typicalLabel);

  return (
    <div
      className={cn(
        "relative flex flex-col px-4 py-3",
        row.isActive && PRODUCTION_TIME_ACTIVE_ROW_BG,
      )}
      data-testid="production-time-row"
    >
      {row.isActive ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            PRODUCTION_TIME_ACTIVE_ROW_ACCENT,
          )}
        />
      ) : null}

      <div className="flex min-h-8 items-center gap-3">
        <span
          aria-label={row.stateLabel}
          className={cn(
            "size-2.5 shrink-0 rounded-[3px]",
            row.isExcluded && "border border-border",
          )}
          data-testid="production-time-row-state-indicator"
          role="img"
          style={{ backgroundColor: PRODUCTION_TIME_TONE_FILL[row.tone] }}
          title={row.stateLabel}
        />

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            row.isExcluded && "text-muted-foreground line-through",
          )}
          data-testid="production-time-row-label"
        >
          {row.label}
        </span>

        <span
          className={cn(
            "shrink-0 text-sm  tabular-nums",
            row.isExcluded && "text-muted-foreground",
          )}
          data-testid="production-time-row-time"
        >
          {typicalMetric ? (
            <>
              <span className="mr-1 text-xs text-muted-foreground">
                {typicalMetric.label}
                {typicalMetric.labelSuffix ? (
                  <span className="ml-0.5 opacity-70">
                    {typicalMetric.labelSuffix}
                  </span>
                ) : null}
              </span>
              {typicalMetric.valueLabel}
            </>
          ) : (
            row.workedLabel
          )}
          {comparison ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {comparison}
            </span>
          ) : null}
        </span>

      </div>

      {/* Sits under the figure it explains: this section was worked more than
       * once, and the time above covers every pass. */}
      {passCount ? (
        <p
          className="mt-0.5 text-right text-xs text-muted-foreground"
          data-testid="production-time-row-passes"
          title={`Worked in ${row.stepCount} passes — the time shown covers all of them.`}
        >
          {passCount}
        </p>
      ) : null}

      {budgetLine ? (
        <p
          className="mt-0.5 text-xs text-muted-foreground"
          data-testid="production-time-row-budget"
        >
          {budgetLine}
        </p>
      ) : null}

      {row.terminalMetrics ? (
        <div className="mt-3">
          <ProductionTimeMetrics
            metrics={row.terminalMetrics}
            workedLabel={row.workedLabel}
          />
        </div>
      ) : null}

      {row.detail && row.activeMetrics ? (
        <div className="mt-3">
          <ProductionTimeRowDetail
            detail={row.detail}
            metrics={row.activeMetrics}
            workedLabel={row.workedLabel}
          />
        </div>
      ) : null}

      {!row.detail && row.activeMetrics ? (
        <div className="mt-3">
          <ProductionTimeMetrics
            isMuted={row.tone === "pending"}
            metrics={row.activeMetrics}
            workedLabel={row.workedLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
