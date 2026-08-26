import { cn } from "@beyo/lib";

import type { ProductionTimeInfeasibleNoticeViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_DANGER_BODY_TEXT,
  PRODUCTION_TIME_DANGER_SURFACE,
  PRODUCTION_TIME_DANGER_TEXT,
} from "./production-time-tone";

export type ProductionTimeInfeasibleNoticeProps = {
  notice: ProductionTimeInfeasibleNoticeViewModel;
};

/**
 * Sits above the headline, because it is the premise for everything under it:
 * without it "1h 7m of 0m" and a column of 0m budgets read as missing data
 * rather than as the real answer for a task whose costs already outran its
 * price.
 *
 * It borrows the outlook line's soft danger surface but leads with a title and
 * an accent rule — the outlook is a footnote to figures that hold, this
 * explains why the figures are zero.
 */
export function ProductionTimeInfeasibleNotice({
  notice,
}: ProductionTimeInfeasibleNoticeProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-stretch gap-3 rounded-lg px-3 py-3",
        PRODUCTION_TIME_DANGER_SURFACE,
        PRODUCTION_TIME_DANGER_TEXT,
      )}
      data-testid="production-time-infeasible-notice"
    >
      {/* The accent takes its colour from the container, so the rule and the
       * title can never drift apart. */}
      <span
        aria-hidden="true"
        className="w-[3px] shrink-0 rounded-full bg-current"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold">{notice.title}</p>
        <p className={cn("text-sm leading-5", PRODUCTION_TIME_DANGER_BODY_TEXT)}>
          {notice.body.map((segment, index) =>
            segment.emphasis ? (
              <strong
                className="font-semibold"
                data-testid="production-time-infeasible-figure"
                key={index}
              >
                {segment.text}
              </strong>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
