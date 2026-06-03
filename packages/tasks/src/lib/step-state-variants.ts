import type { StatePillVariant } from "@beyo/ui";

export type StepState =
  | "pending"
  | "working"
  | "paused"
  | "ended_shift"
  | "blocked"
  | "completed"
  | "skipped"
  | "failed"
  | "cancelled";

export const STEP_STATE_VARIANT: Record<StepState, StatePillVariant> = {
  pending: "neutral",
  working: "active",
  paused: "warning",
  ended_shift: "warning",
  blocked: "danger",
  completed: "success",
  skipped: "neutral",
  failed: "danger",
  cancelled: "neutral",
};

export function humanizeStepState(
  state: StepState | string | null | undefined,
): string {
  if (!state) return "";
  const withSpaces = state.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
