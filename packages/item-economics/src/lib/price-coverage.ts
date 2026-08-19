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
): { showChip: boolean; isCovered: boolean; markerMinor: number | null } {
  // No anchors, nothing fundable, or no break-even to compare against: the chip
  // and the marker are not rendered, and the screen claims no coverage.
  if (
    anchors === null ||
    !anchors.is_fundable ||
    anchors.break_even_price_minor === null
  ) {
    return { showChip: false, isCovered: false, markerMinor: null };
  }

  return {
    showChip: true,
    isCovered: draftMinor >= anchors.break_even_price_minor,
    // Independently nullable — a null suggestion hides the marker alone.
    markerMinor: anchors.suggested_price_minor,
  };
}
