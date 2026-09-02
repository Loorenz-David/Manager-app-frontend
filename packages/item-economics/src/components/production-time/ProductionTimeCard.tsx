import { useState } from "react";

import {
  PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
  type ProductionTimeCardViewModel,
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
  onStrategyPress,
}: {
  card: ProductionTimeCardViewModel;
  onStrategyPress?: (strategy: TypicalStrategyViewModel) => void;
}): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const overflows = card.rows.length > PRODUCTION_TIME_VIEWPORT_ROW_COUNT;

  return (
    <>
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Above the figures, not below: it is the reason they are zero. */}
        {card.infeasibleNotice ? (
          <ProductionTimeInfeasibleNotice notice={card.infeasibleNotice} />
        ) : null}
        <ProductionTimeHeadline headline={card.headline} />
        <ProductionTimeBudgetBar
          remainderPercent={card.remainderPercent}
          segments={card.segments}
        />
        {card.outlook ? <ProductionTimeOutlook outlook={card.outlook} /> : null}
      </div>

      {overflows && !isExpanded ? (
        <ProductionTimeRowsViewport rows={card.rows} />
      ) : (
        card.rows.map((row) => <ProductionTimeRow key={row.key} row={row} />)
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

  return (
    <ProductionTimeFrame className={className} data-testid="production-time-card">
      {viewModel.kind === "no_budget" ? (
        <>
          <ProductionTimeNoBudgetCard
            card={viewModel.card}
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
          onStrategyPress={onStrategyPress}
        />
      )}
    </ProductionTimeFrame>
  );
}
