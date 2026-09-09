import { useState } from "react";

import {
  PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
  type ProductionTimeCardViewModel,
  type ProductionTimeUnit,
  type ProductionTimeViewModel,
} from "../../lib/production-time-view-model";
import { ProductionTimeBudgetBar } from "./ProductionTimeBudgetBar";
import { ProductionTimeFrame } from "./ProductionTimeFrame";
import { ProductionTimeHeadline } from "./ProductionTimeHeadline";
import { ProductionTimeInfeasibleNotice } from "./ProductionTimeInfeasibleNotice";
import { ProductionTimeNoBudgetCard } from "./ProductionTimeNoBudgetCard";
import { ProductionTimeOutlook } from "./ProductionTimeOutlook";
import { ProductionTimeRow } from "./ProductionTimeRow";
import { ProductionTimeRowsToggle } from "./ProductionTimeRowsToggle";
import { ProductionTimeRowsViewport } from "./ProductionTimeRowsViewport";
import { ProductionTimeUnavailableCard } from "./ProductionTimeUnavailableCard";
import { ProductionTimeUnitToggle } from "./ProductionTimeUnitToggle";
import { TypicalStrategyPill } from "../typical-strategy";
import type { TypicalStrategyViewModel } from "../../lib/typical-strategy";

export type ProductionTimeCardProps = {
  viewModel: ProductionTimeViewModel;
  className?: string;
  onCtaPress?: (kind: "commit" | "valuation") => void;
  /**
   * Opens the strategy disclosure. Injected by the host, since packages never
   * open surfaces themselves; omitted, the pill states without a tap target.
   */
  onStrategyPress?: (strategy: TypicalStrategyViewModel) => void;
};

/**
 * The provenance footer, always at the card's bottom rather than inside the
 * expanded region.
 *
 * The rows toggle only exists above `PRODUCTION_TIME_VIEWPORT_ROW_COUNT`
 * stages, so a card with three or fewer never expands — hiding the strategy
 * behind expansion would have withheld it from exactly the simplest tasks.
 */
function ProductionTimeStrategyFooter({
  strategy,
  onStrategyPress,
}: {
  strategy: TypicalStrategyViewModel;
  onStrategyPress?: (strategy: TypicalStrategyViewModel) => void;
}): React.JSX.Element {
  return (
    <div className="flex justify-end border-t border-border px-4 py-3">
      <TypicalStrategyPill
        label={strategy.pillLabel}
        tone={strategy.tone}
        onPress={
          onStrategyPress === undefined
            ? undefined
            : () => onStrategyPress(strategy)
        }
      />
    </div>
  );
}

function ProductionTimeBudgetBody({
  card,
  unit,
  onStrategyPress,
}: {
  card: ProductionTimeCardViewModel;
  unit: ProductionTimeUnit;
  onStrategyPress?: (strategy: TypicalStrategyViewModel) => void;
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const overflows = card.rows.length > PRODUCTION_TIME_VIEWPORT_ROW_COUNT;
  // The per-piece figures are picked here rather than pushed down as a mode, so
  // the headline, outlook and notice components stay exactly as they were — and
  // so `cost`, `isOverBudget` and `isFinal` come from the whole-order model by
  // construction. Money never divides, and the spread order is what enforces it.
  const reading = unit === "piece" ? (card.unit ?? null) : null;
  const headline = reading
    ? { ...card.headline, ...reading.headline }
    : card.headline;
  const outlook = reading ? reading.outlook : card.outlook;
  const infeasibleNotice = reading
    ? reading.infeasibleNotice
    : card.infeasibleNotice;

  return (
    <>
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Above the figures, not below: it is the reason they are zero. */}
        {infeasibleNotice ? (
          <ProductionTimeInfeasibleNotice notice={infeasibleNotice} />
        ) : null}
        <ProductionTimeHeadline headline={headline} />
        {/* Not restated per piece: every width is a ratio of figures that all
          * divide by the same quantity, so the bar is identical in both units. */}
        <ProductionTimeBudgetBar
          remainderPercent={card.remainderPercent}
          segments={card.segments}
        />
        {outlook ? <ProductionTimeOutlook outlook={outlook} /> : null}
      </div>

      {overflows && !isExpanded ? (
        <ProductionTimeRowsViewport rows={card.rows} unit={unit} />
      ) : (
        card.rows.map((row) => (
          <ProductionTimeRow key={row.key} row={row} unit={unit} />
        ))
      )}

      {overflows ? (
        <ProductionTimeRowsToggle
          isExpanded={isExpanded}
          totalCount={card.rows.length}
          onToggle={() => setIsExpanded((current) => !current)}
        />
      ) : null}

      <ProductionTimeStrategyFooter
        strategy={card.strategy}
        onStrategyPress={onStrategyPress}
      />
    </>
  );
}

/**
 * The whole widget, from a view model alone — no fetching, no clock.
 *
 * An empty pipeline renders nothing: a budget bar with no sections under it
 * says nothing the host page is not already saying.
 */
export function ProductionTimeCard({
  viewModel,
  className,
  onCtaPress,
  onStrategyPress,
}: ProductionTimeCardProps): React.JSX.Element | null {
  // A local, deliberately unpersisted preference that always starts on the
  // whole order — the same reasoning as the headline's time/cost tap: the card
  // is read at a glance, and a per-piece figure remembered from a previous task
  // would be taken for this one's order total.
  //
  // Above the early returns, so the hook order never depends on the view model.
  const [unit, setUnit] = useState<ProductionTimeUnit>("total");

  if (viewModel.kind === "unavailable") {
    return (
      <ProductionTimeFrame className={className} data-testid="production-time-card">
        <ProductionTimeUnavailableCard reason={viewModel.reason} />
      </ProductionTimeFrame>
    );
  }

  if (viewModel.card.rows.length === 0) {
    return null;
  }

  // The per-piece reading's presence is the toggle's whole condition: it is
  // null exactly when the order is one piece and there is nothing to switch to.
  const labelTrailing =
    viewModel.card.unit == null ? null : (
      <ProductionTimeUnitToggle value={unit} onChange={setUnit} />
    );

  return (
    <ProductionTimeFrame
      className={className}
      data-testid="production-time-card"
      labelTrailing={labelTrailing}
    >
      {viewModel.kind === "no_budget" ? (
        <>
          <ProductionTimeNoBudgetCard
            card={viewModel.card}
            unit={unit}
            onCtaPress={onCtaPress}
          />
          <ProductionTimeStrategyFooter
            strategy={viewModel.card.strategy}
            onStrategyPress={onStrategyPress}
          />
        </>
      ) : (
        <ProductionTimeBudgetBody
          card={viewModel.card}
          unit={unit}
          onStrategyPress={onStrategyPress}
        />
      )}
    </ProductionTimeFrame>
  );
}
