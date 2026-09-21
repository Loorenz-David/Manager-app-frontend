/**
 * Width arithmetic for the fulfilment bar.
 *
 * The bar answers one question in one horizontal read: of the quantity a stock
 * need asks for, how much is fulfilled, how much is being worked on, and how
 * much is still missing. Each segment carries its own number *inside* it, which
 * is what makes the widths load-bearing rather than decorative — a segment too
 * narrow to hold two digits is a lying bar.
 *
 * The rules come from the design's own bar logic (`03-component-specification`
 * → FulfilmentBar, and the A1–A7 matrix in `05-ui-states.md`):
 *
 *  - `remaining = max(0, requested − fulfilled − inProgress)`.
 *  - A zero segment renders nothing and takes no width.
 *  - Each non-zero coloured segment keeps a **14 %** minimum so a single digit
 *    stays legible.
 *  - While `remaining > 0` the two coloured segments share a **84 %** budget, so
 *    the grey remainder always keeps room for its own number. With nothing
 *    remaining the budget opens to the full 100 %.
 *  - If the minimums would exceed the budget the pair is scaled down
 *    proportionally — the numbers stay in the right order even when they no
 *    longer stay legible, which is the design's own trade.
 *  - Over-fulfilment clamps at 100 %: the surplus is simply invisible
 *    (state A7 / intention §6.3).
 *
 * The mapping from backend quantities to `fulfilled` / `inProgress` is the
 * logic session's (`fulfilled = quantity_awaiting`,
 * `inProgress = quantity_in_queue + quantity_in_progress` — intention §4.3).
 * This function takes the three numbers and nothing else.
 */

export type FulfilmentQuantities = {
  requested: number;
  fulfilled: number;
  inProgress: number;
};

export type FulfilmentSegment = {
  value: number;
  widthPercent: number;
};

export type FulfilmentSegments = {
  fulfilled: FulfilmentSegment | null;
  inProgress: FulfilmentSegment | null;
  /** The flexible remainder — it takes whatever the coloured pair leaves. */
  remaining: { value: number } | null;
};

/** Minimum width of a non-zero coloured segment, in percent of the track. */
export const SEGMENT_MIN_PERCENT = 14;

/** Share of the track the coloured pair may take while anything remains. */
export const COLOURED_BUDGET_PERCENT = 84;

function atLeastZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeFulfilmentSegments({
  requested,
  fulfilled,
  inProgress,
}: FulfilmentQuantities): FulfilmentSegments {
  const safeRequested = atLeastZero(requested);
  const safeFulfilled = atLeastZero(fulfilled);
  const safeInProgress = atLeastZero(inProgress);

  const remaining = Math.max(
    0,
    safeRequested - safeFulfilled - safeInProgress,
  );

  // With no requested quantity the goal itself is the coloured work, so the
  // proportions are read against what exists rather than against zero.
  const denominator =
    safeRequested > 0 ? safeRequested : safeFulfilled + safeInProgress;

  if (denominator === 0) {
    return { fulfilled: null, inProgress: null, remaining: null };
  }

  const budget = remaining > 0 ? COLOURED_BUDGET_PERCENT : 100;

  let fulfilledWidth =
    safeFulfilled > 0
      ? Math.max((safeFulfilled / denominator) * 100, SEGMENT_MIN_PERCENT)
      : 0;
  let inProgressWidth =
    safeInProgress > 0
      ? Math.max((safeInProgress / denominator) * 100, SEGMENT_MIN_PERCENT)
      : 0;

  const colouredTotal = fulfilledWidth + inProgressWidth;
  if (colouredTotal > budget) {
    const scale = budget / colouredTotal;
    fulfilledWidth *= scale;
    inProgressWidth *= scale;
  }

  return {
    fulfilled:
      safeFulfilled > 0
        ? { value: safeFulfilled, widthPercent: fulfilledWidth }
        : null,
    inProgress:
      safeInProgress > 0
        ? { value: safeInProgress, widthPercent: inProgressWidth }
        : null,
    remaining: remaining > 0 ? { value: remaining } : null,
  };
}
