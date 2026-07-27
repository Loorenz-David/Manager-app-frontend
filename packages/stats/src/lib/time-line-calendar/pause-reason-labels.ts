// Central pause-reason display resolution for the worker timeline calendar.
//
// Segment-level `reason` and `pause_by_reason` keys are opaque `pause_reason_id`s
// (or the reserved `"unspecified"` sentinel, or — roster only — raw free-text
// from a manual whole-shift pause). Resolve them against the response's sibling
// `pause_reasons` lookup map. See
// HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722.md.

import type { PauseReasonLookupMap } from "../../types";

// The backend substitutes this literal for a paused segment with no recorded
// reason. It never appears in the lookup map — render it as its own case.
export const UNSPECIFIED_REASON_KEY = "unspecified";
const UNSPECIFIED_REASON_LABEL = "No reason specified";

// Resolve a bucket/segment reason key to a display label:
//  1. present in the map         → the reason's name
//  2. the `"unspecified"` key    → "No reason specified"
//  3. absent and not unspecified → the raw key (deleted reason, or roster
//     free-text) — never crash, never fabricate a name.
export function resolvePauseReasonLabel(
  key: string | null | undefined,
  reasons: PauseReasonLookupMap,
): string | null {
  if (!key) {
    return null;
  }

  if (key === UNSPECIFIED_REASON_KEY) {
    return UNSPECIFIED_REASON_LABEL;
  }

  return reasons[key]?.name ?? key;
}

// Generic token humanizer, e.g. a raw step-state string "ended_shift" →
// "Ended shift". Used for state labels in the event sheet, not for reasons.
export function humanizeReason(token: string): string {
  const stripped = token
    .replace(/^pause_/, "")
    .replace(/_/g, " ")
    .trim();

  if (!stripped) {
    return "Pause";
  }

  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
