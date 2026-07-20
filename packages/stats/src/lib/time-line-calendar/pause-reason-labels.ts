// Central pause-reason display mapping for the worker timeline calendar.
// The backend reason set is OPEN — unknown values must render a readable
// fallback, never crash (see linear-timeline handoff).

const KNOWN_REASON_LABELS: Record<string, string> = {
  pause_lunch_break: "Lunch break",
  pause_coffee_break: "Coffee break",
  pause_meeting: "Meeting",
  pause_case_created: "Case created",
  pause_other_task_priority: "Other task priority",
  pause_ended_shift: "Ended shift",
  waiting_for_upholstery: "Waiting for upholstery",
  unspecified: "Pause",
};

// "waiting_for_material" → "Waiting for material".
export function humanizeReason(reason: string): string {
  const stripped = reason
    .replace(/^pause_/, "")
    .replace(/_/g, " ")
    .trim();

  if (!stripped) {
    return "Pause";
  }

  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function pauseReasonLabel(reason: string | null | undefined): string {
  if (!reason) {
    return "Pause";
  }

  return KNOWN_REASON_LABELS[reason] ?? humanizeReason(reason);
}
