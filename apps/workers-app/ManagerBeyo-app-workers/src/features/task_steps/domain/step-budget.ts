import { useTickingElapsed } from "@beyo/lib";
import type { BudgetAllocationStep } from "@beyo/item-economics";
import type { StepState } from "../types";

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

/**
 * The "usually ~40m" figure, in one place because three cards render it.
 *
 * It is the quantity-projected typical, not the raw historical median: a worker
 * reading it is asking how long *their* step should take on a task of this
 * size. The raw median is only the fallback for a backend that has not shipped
 * the projection yet — the multiplication is never done here
 * (handoff quantity_normalized_typicals 2026-08-29).
 */
export function workerFacingTypicalSeconds(budget: StepBudget): number | null {
  return (
    budget.step.projected_typical_worker_seconds ??
    budget.step.typical_worker_seconds ??
    null
  );
}

/**
 * What this client believes the step is doing, which is not always what the
 * served payload believes. A start or a pause patches the cache optimistically
 * while the budget payload in hand can still be up to a poll interval old.
 */
export type StepClockContext = {
  stepState: StepState;
  /** `last_state_record.entered_at` — when the client's state began. */
  stateEnteredAtIso: string | null;
};

/**
 * The window of work the client may add on top of the served `worked_seconds`.
 *
 * Anchoring to `receivedAtMs` alone is only correct while the payload itself
 * was serving a working step. A payload fetched while the step was paused
 * carries no part of the current run, so adding the time since its receipt
 * credits the step for a period it was idle — the jump a worker sees when
 * pressing Start, undone a second later by the refetch. The four cases:
 *
 * | served row | this client | accrues over |
 * |---|---|---|
 * | working | working | receipt (or the run's start, if later) → now |
 * | paused  | working | the run's start → now |
 * | working | paused  | receipt → the moment of the pause |
 * | paused  | paused  | nothing; the served value is already whole |
 *
 * This stays inside live-clock handoff §5: elapsed time is only ever added on
 * top of the served value, the served value is never replaced, and a real
 * decrease still snaps down because the baseline resets on every receipt.
 */
function accruedSecondsSince(
  budget: StepBudget,
  { stepState, stateEnteredAtIso }: StepClockContext,
  nowMs: number,
): number {
  const localRunning = stepState === "working";
  const servedRunning = budget.step.state === "working";

  if (!localRunning && !servedRunning) {
    return 0;
  }

  const parsedEnteredAtMs =
    stateEnteredAtIso === null ? Number.NaN : Date.parse(stateEnteredAtIso);
  // Without a local record there is nothing better to anchor to than receipt.
  const enteredAtMs = Number.isNaN(parsedEnteredAtMs)
    ? budget.receivedAtMs
    : parsedEnteredAtMs;

  const startMs = servedRunning
    ? localRunning
      ? // A run that began after the payload was served is not covered by it —
        // the payload predates a pause/resume round trip.
        Math.max(budget.receivedAtMs, enteredAtMs)
      : budget.receivedAtMs
    : enteredAtMs;
  const endMs = localRunning ? nowMs : enteredAtMs;
  const wallClockSeconds = Math.max(0, (endMs - startMs) / 1000);

  return Math.floor(wallClockSeconds * accrualRateOf(budget));
}

/**
 * How fast this step's own total actually grows, in seconds per wall-clock
 * second. A worker running three steps at once is not doing three times the
 * work, so the server credits each a third — and a client that counts a full
 * second per second on all three overshoots by two thirds of every run, then
 * snaps back the moment the true totals arrive.
 *
 * `null` means the served row is not accruing. Falling back to 1 rather than 0
 * is deliberate: a row that predates the current run (the payload in hand when
 * a step is started) carries no rate yet, and freezing the timer until the next
 * payload would read as a broken clock. The refetch that a transition triggers
 * replaces it within a moment, so the un-scaled window is short.
 */
function accrualRateOf(budget: StepBudget): number {
  const served = budget.step.live_accrual_rate;
  if (served === null) {
    return 1;
  }

  const parsed = Number(served);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Pure: the figures a card should show for one step at one instant. Idle cards
 * call this directly so they never subscribe to the shared one-second ticker —
 * their result does not depend on `nowMs` at all.
 */
export function projectStepBudget(
  budget: StepBudget,
  context: StepClockContext,
  nowMs: number,
): LiveStepBudget {
  const accruedSeconds = accruedSecondsSince(budget, context, nowMs);
  const workedSeconds = budget.step.worked_seconds + accruedSeconds;
  const leftSeconds =
    budget.step.left_seconds === null
      ? null
      : budget.step.left_seconds - accruedSeconds;
  // The over-budget state keys on the step's own position, not on
  // share_state — that one describes the whole section (handoff §5 nuance).
  const isOver = leftSeconds !== null && leftSeconds < 0;

  return { workedSeconds, leftSeconds, isOver };
}

/**
 * The figures for a step this client is not running. A resting step's position
 * is fixed by the moment it stopped, so this needs no clock at all — which is
 * what makes it safe to call during render, unlike anything reading
 * `Date.now()`. Pass the state the card is actually rendering; a running step
 * routed through here would simply hold its served value.
 */
export function restingStepBudget(
  budget: StepBudget,
  context: StepClockContext,
): LiveStepBudget {
  return projectStepBudget(budget, context, budget.receivedAtMs);
}

// Only meant to be mounted while the step is working, so idle cards never
// subscribe to the shared one-second ticker.
export function useLiveStepBudget(
  budget: StepBudget,
  context: StepClockContext,
): LiveStepBudget {
  const elapsedMs = useTickingElapsed(budget.receivedAtMs);

  return projectStepBudget(budget, context, budget.receivedAtMs + elapsedMs);
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
