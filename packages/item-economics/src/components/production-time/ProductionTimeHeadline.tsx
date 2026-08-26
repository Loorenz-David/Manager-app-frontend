import { useState } from "react";

import { cn } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

import type { ProductionTimeHeadlineViewModel } from "../../lib/production-time-view-model";
import { PRODUCTION_TIME_DANGER_TEXT } from "./production-time-tone";

export type ProductionTimeHeadlineProps = {
  headline: ProductionTimeHeadlineViewModel;
};

/**
 * Both readings stay mounted and swap in place, which is what keeps the change
 * from reflowing the card: the stack is always as wide as its widest member, so
 * the row never resizes when the unit changes.
 *
 * They are handed off rather than cross-faded. Two different strings sitting at
 * half opacity on the same baseline ghost over each other and read as a smear,
 * so the outgoing one is nearly gone (120ms, ease-in, accelerating away) before
 * the incoming one begins (90ms in, ease-out, decelerating into place). The
 * ~30ms they share is only enough to stop the row flashing empty.
 *
 * The transition names `translate`, NOT `transform`: Tailwind v4 compiles
 * `translate-y-*` to the standalone `translate` property, so a list naming only
 * `transform` animates the fade while the movement jumps in a single frame —
 * which is precisely what a broken-looking swap is.
 */
const SWAP_BASE =
  "col-start-1 row-start-1 flex min-w-0 items-baseline gap-2 transition-[opacity,translate] motion-reduce:transition-none";
const SWAP_ENTER =
  "translate-y-0 opacity-100 delay-[90ms] duration-[180ms] ease-out";
const SWAP_LEAVE = "pointer-events-none opacity-0 duration-[120ms] ease-in";

function HeadlineStack({
  isCost,
  align,
  time,
  cost,
}: {
  isCost: boolean;
  align: "start" | "end";
  time: React.ReactNode;
  cost: React.ReactNode | null;
}): React.JSX.Element {
  // `min-w-0` on the layer as well as the stack: a grid item defaults to
  // min-width:auto, which would stop the budget label from truncating.
  const layer = (isVisible: boolean, restingOffset: string) =>
    cn(
      SWAP_BASE,
      isVisible ? SWAP_ENTER : cn(SWAP_LEAVE, restingOffset),
    );

  return (
    <span
      className={cn(
        "grid",
        align === "end" ? "justify-items-end" : "min-w-0 justify-items-start",
      )}
    >
      {/* Time leaves upward and cost arrives from below, so the two taps read
       * as one figure turning over rather than two unrelated fades. */}
      <span
        aria-hidden={isCost}
        className={layer(!isCost, "-translate-y-2")}
        data-mode="time"
        data-visible={!isCost}
      >
        {time}
      </span>
      {cost === null ? null : (
        <span
          aria-hidden={!isCost}
          className={layer(isCost, "translate-y-2")}
          data-mode="cost"
          data-visible={isCost}
        >
          {cost}
        </span>
      )}
    </span>
  );
}

/**
 * Worked / of budget / left, in minutes or in money.
 *
 * The unit is a local, deliberately unpersisted preference that always starts
 * on time: time is what the card is called and what every row under it speaks,
 * and a headline that remembered kronor from a previous task would be read as
 * minutes by anyone glancing at it.
 */
export function ProductionTimeHeadline({
  headline,
}: ProductionTimeHeadlineProps): React.JSX.Element {
  const [showCost, setShowCost] = useState(false);
  const cost = headline.cost;
  const isCost = cost !== null && showCost;

  const content = (
    <>
      <HeadlineStack
        align="start"
        isCost={isCost}
        time={
          <>
            <span
              className="text-xl font-semibold tracking-tight tabular-nums"
              data-testid="production-time-headline-worked"
            >
              {headline.workedLabel}
            </span>
            {headline.budgetLabel ? (
              <span
                className="truncate text-md font-normal text-muted-foreground"
                data-testid="production-time-headline-budget"
              >
                {headline.budgetLabel}
              </span>
            ) : null}
          </>
        }
        cost={
          cost === null ? null : (
            <>
              <span
                className="text-xl font-semibold tracking-tight tabular-nums"
                data-testid="production-time-headline-cost-worked"
              >
                {cost.workedLabel}
              </span>
              {cost.budgetLabel ? (
                <span
                  className="truncate text-md font-normal text-muted-foreground"
                  data-testid="production-time-headline-cost-budget"
                >
                  {cost.budgetLabel}
                </span>
              ) : null}
            </>
          )
        }
      />

      <span className="flex shrink-0 items-center gap-2">
        {headline.isFinal ? (
          <StatePill label="Final" variant="neutral" />
        ) : null}
        <HeadlineStack
          align="end"
          isCost={isCost}
          time={
            headline.remainingLabel ? (
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
            ) : null
          }
          cost={
            cost === null || cost.remainingLabel === null ? null : (
              <span
                className={cn(
                  "text-sm",
                  cost.isOverBudget
                    ? cn(PRODUCTION_TIME_DANGER_TEXT, "font-medium")
                    : "text-muted-foreground",
                )}
                data-testid="production-time-headline-cost-remaining"
              >
                {cost.remainingLabel}
              </span>
            )
          }
        />
      </span>
    </>
  );

  if (cost === null) {
    return (
      <div
        className="flex items-baseline justify-between gap-3"
        data-mode="time"
        data-testid="production-time-headline"
      >
        {content}
      </div>
    );
  }

  return (
    <button
      aria-label={
        isCost
          ? "Show the worked and budgeted time"
          : "Show the cost of the worked and budgeted time"
      }
      aria-pressed={isCost}
      // No press dimming: a parent opacity multiplies into the children's own
      // fade, so the whole row used to darken and lift at once mid-swap. The
      // swap itself is the feedback.
      className="flex w-full items-baseline justify-between gap-3 text-left"
      data-mode={isCost ? "cost" : "time"}
      data-testid="production-time-headline"
      type="button"
      onClick={() => setShowCost((current) => !current)}
    >
      {content}
    </button>
  );
}
