/**
 * Width arithmetic for the fulfilment bar.
 *
 * The bar answers one question in one horizontal read: of the quantity a stock
 * need asks for, how much is fulfilled, how much is being worked on, how much
 * is queued, and how much is still missing. Each segment carries its own number
 * *inside* it, which is what makes the widths load-bearing rather than
 * decorative — a segment too narrow to hold two digits is a lying bar.
 *
 * Segments read left to right from most advanced to least:
 * **fulfilled → in progress → in queue → missing → remaining**.
 *
 * The rules come from the design's own bar logic (`03-component-specification`
 * → FulfilmentBar, and the A1–A7 matrix in `05-ui-states.md`):
 *
 *  - `remaining = max(0, requested − fulfilled − inProgress − inQueue − missing)`.
 *  - A zero segment renders nothing and takes no width.
 *  - Each non-zero coloured segment keeps a **14 %** minimum so a single digit
 *    stays legible.
 *  - While `remaining > 0` the coloured segments share a **84 %** budget, so the
 *    grey remainder always keeps room for its own number. With nothing
 *    remaining the budget opens to the full 100 %.
 *  - If the minimums would exceed the budget the set is scaled down
 *    proportionally — the numbers stay in the right order even when they no
 *    longer stay legible, which is the design's own trade. Three coloured
 *    segments at their floor come to 42 %, well inside the 84 % budget, so the
 *    scaling only ever bites on genuinely lopsided numbers. Four (with
 *    missing) come to 56 %, still inside it.
 *  - Over-fulfilment clamps at 100 %: the surplus is simply invisible
 *    (state A7 / intention §6.3).
 *
 * **In queue is its own segment (owner, 2026-09-22).** Intention §4.3 originally
 * folded it into in progress (`inProgress = quantity_in_queue +
 * quantity_in_progress`); the owner split them so queued work reads as waiting
 * rather than as under way.
 *
 * **Missing is the fourth coloured segment (owner, 2026-09-26).** It is the
 * snapshot's `quantity_missing`: units the buyer still has to find. It sits
 * after the work segments and before the grey remainder, so the bar reads
 * "done → moving → queued → cannot be covered → still open". Amber, because it
 * is a warning to the manager, and it counts against the remainder like the
 * others. The mapping from backend quantities is still the logic layer's —
 * this function takes the five numbers and nothing else.
 */

export type FulfilmentQuantities = {
  requested: number;
  fulfilled: number;
  inProgress: number;
  inQueue: number;
  missing: number;
};

export type FulfilmentSegment = {
  value: number;
  widthPercent: number;
};

export type FulfilmentSegments = {
  fulfilled: FulfilmentSegment | null;
  inProgress: FulfilmentSegment | null;
  inQueue: FulfilmentSegment | null;
  missing: FulfilmentSegment | null;
  /** The flexible remainder — it takes whatever the coloured set leaves. */
  remaining: { value: number } | null;
};

/** Minimum width of a non-zero coloured segment, in percent of the track. */
export const SEGMENT_MIN_PERCENT = 14;

/** Share of the track the coloured set may take while anything remains. */
export const COLOURED_BUDGET_PERCENT = 84;

function atLeastZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeFulfilmentSegments({
  requested,
  fulfilled,
  inProgress,
  inQueue,
  missing,
}: FulfilmentQuantities): FulfilmentSegments {
  const safeRequested = atLeastZero(requested);
  const safeFulfilled = atLeastZero(fulfilled);
  const safeInProgress = atLeastZero(inProgress);
  const safeInQueue = atLeastZero(inQueue);
  const safeMissing = atLeastZero(missing);

  const colouredTotal =
    safeFulfilled + safeInProgress + safeInQueue + safeMissing;
  const remaining = Math.max(0, safeRequested - colouredTotal);

  // With no requested quantity the goal itself is the coloured work, so the
  // proportions are read against what exists rather than against zero.
  const denominator = safeRequested > 0 ? safeRequested : colouredTotal;

  if (denominator === 0) {
    return {
      fulfilled: null,
      inProgress: null,
      inQueue: null,
      missing: null,
      remaining: null,
    };
  }

  const budget = remaining > 0 ? COLOURED_BUDGET_PERCENT : 100;

  // Floor first, scale second: a slice of one piece is widened to its minimum
  // before the set is squeezed, so it never disappears behind a rounding error.
  const widths = [safeFulfilled, safeInProgress, safeInQueue, safeMissing].map((value) =>
    value > 0
      ? Math.max((value / denominator) * 100, SEGMENT_MIN_PERCENT)
      : 0,
  );

  const widthTotal = widths[0] + widths[1] + widths[2] + widths[3];
  const scale = widthTotal > budget ? budget / widthTotal : 1;

  function segment(value: number, width: number): FulfilmentSegment | null {
    return value > 0 ? { value, widthPercent: width * scale } : null;
  }

  return {
    fulfilled: segment(safeFulfilled, widths[0]),
    inProgress: segment(safeInProgress, widths[1]),
    inQueue: segment(safeInQueue, widths[2]),
    missing: segment(safeMissing, widths[3]),
    remaining: remaining > 0 ? { value: remaining } : null,
  };
}
