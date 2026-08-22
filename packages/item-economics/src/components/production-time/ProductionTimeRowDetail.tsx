import { cn } from "@beyo/lib";

import {
  buildBudgetLine,
  type ProductionTimeRowDetailViewModel,
} from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_TEXT,
  PRODUCTION_TIME_SUCCESS_TEXT,
  PRODUCTION_TIME_TONE_FILL,
} from "./production-time-tone";

export type ProductionTimeRowDetailProps = {
  detail: ProductionTimeRowDetailViewModel;
  /** "3m allowed" — names the number the bar's full width represents. */
  allowanceLabel: string | null;
  typicalLabel: string | null;
};

/**
 * The active row's own bar: worked time against this section's allowance, with
 * the server's verdict beneath. The typical appears as text in the budget
 * line — the marker it once drew was provably identical on every row (plan
 * E3) and was removed with the 2026-08-22 live-clock integration.
 */
export function ProductionTimeRowDetail({
  detail,
  allowanceLabel,
  typicalLabel,
}: ProductionTimeRowDetailProps): React.JSX.Element {
  const isOverShare = detail.verdictTone === "over_share";
  const budgetLine = buildBudgetLine(allowanceLabel, typicalLabel);

  return (
    <div className="flex flex-col gap-1.5" data-testid="production-time-row-detail">
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

      <div className="flex items-center justify-between gap-3">
        <span
          className="min-w-0 truncate text-sm text-muted-foreground"
          data-testid="production-time-row-budget"
        >
          {budgetLine}
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-medium",
            isOverShare
              ? PRODUCTION_TIME_DANGER_TEXT
              : PRODUCTION_TIME_SUCCESS_TEXT,
          )}
          data-testid="production-time-row-verdict"
        >
          {detail.verdictLabel}
        </span>
      </div>
    </div>
  );
}
