import { useState } from "react";

import {
  PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
  type ProductionTimeNoBudgetViewModel,
} from "../../lib/production-time-view-model";
import { ProductionTimeRow } from "./ProductionTimeRow";
import { ProductionTimeRowsToggle } from "./ProductionTimeRowsToggle";
import { ProductionTimeRowsViewport } from "./ProductionTimeRowsViewport";

export type ProductionTimeNoBudgetCardProps = {
  card: ProductionTimeNoBudgetViewModel;
  onCtaPress?: (kind: "commit" | "valuation") => void;
};

/**
 * The degraded state. Absence with a reason is something a manager can act on;
 * a blank space or "0m of 0m" is not — so the frame stays, the real pipeline
 * still renders against its typicals, and only the budget figures are missing.
 */
export function ProductionTimeNoBudgetCard({
  card,
  onCtaPress,
}: ProductionTimeNoBudgetCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const cta = card.cta;
  const overflows = card.rows.length > PRODUCTION_TIME_VIEWPORT_ROW_COUNT;

  return (
    <>
      <div
        className="flex flex-col gap-3 px-4 py-4"
        data-testid="production-time-no-budget"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-md font-semibold tracking-tight tabular-nums">
            {card.workedLabel}
          </span>
          <span className="text-base font-normal text-muted-foreground">
            worked so far
          </span>
        </div>

        {/* The raw status value rides along as a title attribute: support can
         * read the exact code without it ever reaching the copy. */}
        <div
          className="flex flex-col gap-1"
          data-testid="production-time-no-budget-reason"
          title={card.rawStatus}
        >
          <p className="text-sm font-medium">{card.reasonTitle}</p>
          <p className="text-sm text-muted-foreground">{card.reasonBody}</p>
        </div>

        {cta ? (
          <button
            className="self-start rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors active:bg-muted/20"
            data-testid="production-time-no-budget-cta"
            type="button"
            onClick={() => onCtaPress?.(cta.kind)}
          >
            {cta.label}
          </button>
        ) : null}
      </div>

      {overflows && !isExpanded ? (
        <ProductionTimeRowsViewport rows={card.rows} showTypicalComparison />
      ) : (
        card.rows.map((row) => (
          <ProductionTimeRow key={row.key} row={row} showTypicalComparison />
        ))
      )}

      {overflows ? (
        <ProductionTimeRowsToggle
          isExpanded={isExpanded}
          totalCount={card.rows.length}
          onToggle={() => setIsExpanded((current) => !current)}
        />
      ) : null}
    </>
  );
}
