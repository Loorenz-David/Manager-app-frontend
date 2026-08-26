import { useTickingElapsed } from "@beyo/lib";
import type { BudgetAllocationStep } from "@beyo/item-economics";

/**
 * A step's budget row paired with the moment its payload was received.
 * `receivedAtMs` is the smoothing baseline of the live-clock handoff §5: the
 * client may add elapsed time on top of the served value between polls, and
 * the baseline resets to the served value on every receipt — never clamped to
 * a previous maximum.
 */
export type StepBudget = {
  step: BudgetAllocationStep;
  receivedAtMs: number;
};

export type StepBudgetTone = "ok" | "warn" | "over";

/**
 * The backend ships no warning threshold — "44m left" teal vs "9m left" amber
 * is a client decision (budget-allocations handoff §4).
 */
const WARN_CONSUMED_FRACTION = 0.75;

export function budgetToneFor(
  workedSeconds: number,
  allowanceSeconds: number,
): StepBudgetTone {
  if (allowanceSeconds <= 0 || workedSeconds > allowanceSeconds) {
    return "over";
  }
  if (workedSeconds >= allowanceSeconds * WARN_CONSUMED_FRACTION) {
    return "warn";
  }
  return "ok";
}

export type LiveStepBudget = {
  workedSeconds: number;
  leftSeconds: number | null;
  isOver: boolean;
};

/**
 * The live pressure share is a server-calculated target, never a client-side
 * countdown. Workers must not receive more time just because an earlier
 * section finished cheaply, so the target is capped by their original
 * allowance. `null` means the pressure calculation does not apply.
 */
export function workerFacingAllowanceSeconds(
  allowanceSeconds: number | null,
  pressureShareSeconds: number | null,
): number | null {
  if (allowanceSeconds === null) return pressureShareSeconds;
  if (pressureShareSeconds === null) return allowanceSeconds;
  return Math.min(allowanceSeconds, pressureShareSeconds);
}

export function workerFacingAllowanceForBudget(
  budget: StepBudget,
): number | null {
  return workerFacingAllowanceSeconds(
    budget.step.allowance_seconds,
    budget.step.pressure_share_seconds,
  );
}

// Only meant to be mounted while the step is working, so idle cards never
// subscribe to the shared one-second ticker. The served value is the
// baseline on every receipt (live-clock handoff §5): elapsed time is added on
// top from the moment of receipt, and a served decrease snaps down in one
// step because the baseline resets — never clamped to the previous maximum,
// never animated.
export function useLiveStepBudget(budget: StepBudget): LiveStepBudget {
  const elapsedMs = useTickingElapsed(budget.receivedAtMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const workedSeconds = budget.step.worked_seconds + elapsedSeconds;
  const leftSeconds =
    budget.step.left_seconds === null
      ? null
      : budget.step.left_seconds - elapsedSeconds;
  // The over-budget state keys on the step's own position, not on
  // share_state — that one describes the whole section (handoff §5 nuance).
  const isOver = leftSeconds !== null && leftSeconds < 0;

  return { workedSeconds, leftSeconds, isOver };
}

export const STEP_BUDGET_TONE_FILL: Record<StepBudgetTone, string> = {
  ok: "#3f7f88",
  warn: "#d9a62e",
  over: "#c0473a",
};

export const STEP_BUDGET_TONE_TEXT: Record<StepBudgetTone, string> = {
  ok: "text-[#3f7f88]",
  warn: "text-[#8a6d1c]",
  over: "text-[#b9382a]",
};

/** "2h 00m", "1h 14m", "44m". */
export function formatDurationHM(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

/** Minute-level overrun copy: "26m" under an hour, "1h 04m" above. */
export function formatOverBudgetAmount(totalSeconds: number): string {
  return formatDurationHM(totalSeconds);
}
