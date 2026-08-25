import { cn } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

import {
  buildBudgetLine,
  formatPassCount,
  type ProductionTimeRowViewModel,
} from "../../lib/production-time-view-model";
import { ProductionTimeRowDetail } from "./ProductionTimeRowDetail";
import {
  PRODUCTION_TIME_ACTIVE_ROW_ACCENT,
  PRODUCTION_TIME_ACTIVE_ROW_BG,
  PRODUCTION_TIME_TONE_FILL,
  PRODUCTION_TIME_TONE_VARIANT,
} from "./production-time-tone";

export type ProductionTimeRowProps = {
  row: ProductionTimeRowViewModel;
  /**
   * The degraded, budget-less card: the row trades its state pill for the
   * typical comparison — "Sanding · 25m of typically 50m" — which is the one
   * case where the display is driven by the typical rather than an allowance.
   */
  showTypicalComparison?: boolean;
};

export function ProductionTimeRow({
  row,
  showTypicalComparison = false,
}: ProductionTimeRowProps): React.JSX.Element {
  const comparison = showTypicalComparison ? row.typicalComparisonLabel : null;
  const passCount = formatPassCount(row.stepCount);
  // The active row states its budget inside its own detail block, beside the
  // bar that draws it. Every other row has no bar, so it says it here — which
  // is the whole point: a pending stage has to be able to look tight.
  const budgetLine = row.detail
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
          aria-hidden="true"
          className={cn(
            "size-2.5 shrink-0 rounded-[3px]",
            row.isExcluded && "border border-border",
          )}
          style={{ backgroundColor: PRODUCTION_TIME_TONE_FILL[row.tone] }}
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

        {comparison === null ? (
          <span className="shrink-0" data-testid="production-time-row-state">
            <StatePill
              className="text-xs"
              label={row.stateLabel}
              style="text"
              variant={PRODUCTION_TIME_TONE_VARIANT[row.tone]}
            />
          </span>
        ) : null}

        <span
          className={cn(
            "shrink-0 text-sm  tabular-nums",
            row.isExcluded && "text-muted-foreground",
          )}
          data-testid="production-time-row-time"
        >
          {row.workedLabel}
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

      {row.detail ? (
        <div className="mt-2">
          <ProductionTimeRowDetail
            allowanceLabel={row.allowanceLabel}
            detail={row.detail}
            pressureLabel={row.pressureLabel}
            typicalLabel={row.typicalLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
