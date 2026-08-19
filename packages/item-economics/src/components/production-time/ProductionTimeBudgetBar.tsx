import type { ProductionTimeSegmentViewModel } from "../../lib/production-time-view-model";
import {
  PRODUCTION_TIME_REMAINDER_HATCH,
  PRODUCTION_TIME_TONE_FILL,
} from "./production-time-tone";

export type ProductionTimeBudgetBarProps = {
  segments: ProductionTimeSegmentViewModel[];
  remainderPercent: number;
};

/**
 * The budget, filled by each section's worked time in its own state colour,
 * with the unconsumed remainder hatched.
 *
 * Widths are flex bases in percent. The 3px gaps push the total past 100%, and
 * flex-shrink absorbs that proportionally to the basis — so the relative widths
 * survive regardless of how many sections there are.
 */
export function ProductionTimeBudgetBar({
  segments,
  remainderPercent,
}: ProductionTimeBudgetBarProps): React.JSX.Element | null {
  if (segments.length === 0 && remainderPercent <= 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-2 w-full items-stretch gap-[3px]"
      data-testid="production-time-budget-bar"
    >
      {segments.map((segment) => (
        <span
          key={segment.key}
          className="min-w-px rounded-[3px]"
          data-testid="production-time-budget-segment"
          style={{
            flexBasis: `${segment.widthPercent}%`,
            backgroundColor: PRODUCTION_TIME_TONE_FILL[segment.tone],
          }}
        />
      ))}
      {remainderPercent > 0 ? (
        <span
          className="min-w-px rounded-[3px] bg-muted/40"
          data-testid="production-time-budget-remainder"
          style={{
            flexBasis: `${remainderPercent}%`,
            backgroundImage: PRODUCTION_TIME_REMAINDER_HATCH,
          }}
        />
      ) : null}
    </div>
  );
}
