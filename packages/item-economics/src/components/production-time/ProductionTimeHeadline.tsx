import { cn } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

import type { ProductionTimeHeadlineViewModel } from "../../lib/production-time-view-model";
import { PRODUCTION_TIME_DANGER_TEXT } from "./production-time-tone";

export type ProductionTimeHeadlineProps = {
  headline: ProductionTimeHeadlineViewModel;
};

export function ProductionTimeHeadline({
  headline,
}: ProductionTimeHeadlineProps): React.JSX.Element {
  return (
    <div
      className="flex items-baseline justify-between gap-3"
      data-testid="production-time-headline"
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className="text-2xl font-semibold tracking-tight tabular-nums"
          data-testid="production-time-headline-worked"
        >
          {headline.workedLabel}
        </span>
        {headline.budgetLabel ? (
          <span
            className="truncate text-base font-normal text-muted-foreground"
            data-testid="production-time-headline-budget"
          >
            {headline.budgetLabel}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {headline.isFinal ? <StatePill label="Final" variant="neutral" /> : null}
        {headline.remainingLabel ? (
          <span
            className={cn(
              "text-sm",
              headline.isOverBudget
                ? cn(PRODUCTION_TIME_DANGER_TEXT, "font-medium")
                : "text-muted-foreground",
            )}
            data-testid="production-time-headline-remaining"
          >
            {headline.remainingLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
