import type { PriceScenarioAnchors } from "../types";

/**
 * The coverage chip and the suggestion marker (intention §4A M7, handoff §5.3).
 *
 * Both are anchor-driven. Comparing a locally computed allowance against the
 * typical would put the chip's flip at the mercy of the last minor unit of
 * rounding, exactly at the boundary — the most visible place on the screen to be
 * off by one step. Comparing against the server's own integer makes the flip
 * exact and makes the chip and the marker agree by construction.
 */
export function resolveCoverage(
  draftMinor: number,
  anchors: PriceScenarioAnchors | null,
): {
  showChip: boolean;
  isCovered: boolean;
  isInfeasible: boolean;
  markerMinor: number | null;
} {
  // No anchors at all: nothing to judge the draft against.
  if (anchors === null) {
    return {
      showChip: false,
      isCovered: false,
      isInfeasible: false,
      markerMinor: null,
    };
  }

  // Infeasibility is decided on its own, ahead of coverage, and never from
  // `is_fundable`. That flag is only `break_even is not None`, which the server
  // also returns null for a task with no typical sample yet — a perfectly
  // feasible item we simply cannot break even against. `infeasible_at_or_below`
  // is always served and always means the same thing: at or below it the price
  // funds not one second of work.
  const isInfeasible = draftMinor <= anchors.infeasible_at_or_below_minor;

  // Nothing to break even against. The chip still speaks when the price funds
  // no work at all — that is knowable without a break-even, and it is the one
  // state the screen must never leave unsaid. The marker stays hidden, as
  // before: a suggestion needs the anchor this branch is missing.
  if (!anchors.is_fundable || anchors.break_even_price_minor === null) {
    return {
      showChip: isInfeasible,
      isCovered: false,
      isInfeasible,
      markerMinor: null,
    };
  }

  return {
    showChip: true,
    // Break-even funds the whole typical, so it always sits above the
    // one-second floor: covered and infeasible cannot both be true here.
    isCovered: draftMinor >= anchors.break_even_price_minor,
    isInfeasible,
    // Independently nullable — a null suggestion hides the marker alone.
    markerMinor: anchors.suggested_price_minor,
  };
}
