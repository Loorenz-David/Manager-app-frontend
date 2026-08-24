import { CircleAlert, Pause, Play } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { useTickingElapsed } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { formatSecondsHHMMSS } from "../domain/formatSecondsHHMMSS";
import {
  budgetToneFor,
  formatDurationHM,
  formatOverBudgetAmount,
  STEP_BUDGET_TONE_TEXT,
  type StepBudget,
} from "../domain/step-budget";
import { preloadPauseReasonSheetSurface } from "../surfaces";
import {
  STEP_QUICK_TRANSITION,
  type LastStateRecord,
  type StepState,
} from "../types";

const WORKING_BG = "bg-[var(--color-soft-container)] text-foreground";
const OVER_BUDGET_BG = "bg-[#c0473a]/10 text-foreground";
// Paused steps get their own surface so "Switch to Start" reads differently
// from both a running card and an unstarted one.
const SWITCH_BG = "bg-muted text-foreground";
const PENDING_BG = "bg-primary text-card";

type TaskStepActionButtonProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  lastStateRecord: LastStateRecord | null;
  totalWorkingSeconds: number;
  budget: StepBudget | null;
  onTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  isTransitioning: boolean;
};

type ActionButtonShellProps = {
  stepId: TaskStepId;
  label: string;
  icon: "play" | "pause";
  bgClass: string;
  disabled: boolean;
  onClick: () => void;
  banner?: React.ReactNode;
  right?: React.ReactNode;
};

function ActionButtonShell({
  stepId,
  label,
  icon,
  bgClass,
  disabled,
  onClick,
  banner,
  right,
}: ActionButtonShellProps): React.JSX.Element {
  const Icon = icon === "pause" ? Pause : Play;

  return (
    <button
      aria-label={label}
      className={`flex w-full items-center justify-between gap-3 border-t border-border/50 px-4 py-3.5 transition-opacity ${bgClass} disabled:opacity-60`}
      data-testid={`task-step-action-button-${stepId}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="flex items-center gap-3">
          <Icon
            aria-hidden="true"
            className="size-5 shrink-0 fill-current stroke-none"
          />
          <span className="text-md font-medium">{label}</span>
        </span>
        {banner}
      </span>
      {right}
    </button>
  );
}

/**
 * The line under the timer: budget position when allocated ("44m left" /
 * "of 2h 00m"), or the section's history when there is no budget ("usually
 * ~40m"). The two wordings must stay distinct — a limit and history are
 * different kinds of truth (budget-allocations handoff §4).
 */
function budgetSecondaryLabel(
  stepId: TaskStepId,
  budget: StepBudget,
  workedSeconds: number,
  leftSeconds: number | null,
): React.ReactNode {
  const { allowance_seconds, share_state, typical_worker_seconds } =
    budget.step;

  if (allowance_seconds !== null && leftSeconds !== null) {
    if (leftSeconds < 0) {
      return (
        <span
          className="font-mono text-xs font-medium text-[#b9382a]"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          of {formatDurationHM(allowance_seconds)}
        </span>
      );
    }

    const tone = budgetToneFor(workedSeconds, allowance_seconds);
    return (
      <span
        className={`font-mono text-xs font-medium ${STEP_BUDGET_TONE_TEXT[tone]}`}
        data-testid={`step-budget-secondary-${stepId}`}
      >
        {formatDurationHM(leftSeconds)} left
      </span>
    );
  }

  if (share_state === "no_budget" && typical_worker_seconds !== null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        data-testid={`step-budget-secondary-${stepId}`}
      >
        usually ~{formatDurationHM(typical_worker_seconds)}
      </span>
    );
  }

  return null;
}

type WorkingBudgetButtonProps = {
  stepId: TaskStepId;
  label: string;
  budget: StepBudget;
  disabled: boolean;
  onClick: () => void;
};

// Only mounted while the step is working, so idle cards never subscribe to
// the shared one-second ticker. The served value is the baseline on every
// receipt (live-clock handoff §5): elapsed time is added on top from the
// moment of receipt, and a served decrease snaps down in one step because the
// baseline resets — never clamped to the previous maximum, never animated.
function WorkingBudgetButton({
  stepId,
  label,
  budget,
  disabled,
  onClick,
}: WorkingBudgetButtonProps): React.JSX.Element {
  const elapsedMs = useTickingElapsed(budget.receivedAtMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const workedSeconds = budget.step.worked_seconds + elapsedSeconds;
  const leftSeconds =
    budget.step.left_seconds === null
      ? null
      : budget.step.left_seconds - elapsedSeconds;
  // The over-budget banner keys on the step's own position, not on
  // share_state — that one describes the whole section (handoff §5 nuance).
  const isOver = leftSeconds !== null && leftSeconds < 0;

  return (
    <ActionButtonShell
      banner={
        isOver ? (
          <span
            className="flex items-center gap-1.5 text-xs font-bold text-[#b9382a]"
            data-testid={`step-budget-over-banner-${stepId}`}
          >
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            Over budget by {formatOverBudgetAmount(-leftSeconds)}
          </span>
        ) : undefined
      }
      bgClass={isOver ? OVER_BUDGET_BG : WORKING_BG}
      disabled={disabled}
      icon="pause"
      label={label}
      right={
        <span className="flex shrink-0 flex-col items-end">
          <span
            className={`font-mono text-sm font-semibold ${isOver ? "text-[#b9382a]" : ""}`}
            data-testid={`task-step-timer-${stepId}`}
          >
            {formatSecondsHHMMSS(workedSeconds)}
          </span>
          {budgetSecondaryLabel(stepId, budget, workedSeconds, leftSeconds)}
        </span>
      }
      stepId={stepId}
      onClick={onClick}
    />
  );
}

export function TaskStepActionButton({
  stepId,
  taskId,
  state,
  lastStateRecord,
  totalWorkingSeconds,
  budget,
  onTransition,
  isTransitioning,
}: TaskStepActionButtonProps): React.JSX.Element | null {
  const nextState = STEP_QUICK_TRANSITION[state];
  usePreloadSurface(preloadPauseReasonSheetSurface);
  if (nextState === undefined) {
    return null;
  }

  const isWorking = state === "working";
  const isPending = state === "pending";

  const label = isPending
    ? "Start Task"
    : isWorking
      ? "Pause Task"
      : "Switch to Start";
  const handleClick = (): void => onTransition(stepId, taskId, nextState);

  if (isWorking && budget) {
    return (
      <WorkingBudgetButton
        budget={budget}
        disabled={isTransitioning}
        label={label}
        stepId={stepId}
        onClick={handleClick}
      />
    );
  }

  const bgClass = isWorking
    ? WORKING_BG
    : isPending
      ? PENDING_BG
      : SWITCH_BG;

  let right: React.ReactNode = null;
  if (isWorking && lastStateRecord) {
    // Budget payload not here yet (loading or errored) — the pre-budget
    // ticker basis carries the card until it arrives.
    right = (
      <TickingTimer
        className="font-mono text-xs opacity-90"
        data-testid={`task-step-timer-${stepId}`}
        offsetSeconds={totalWorkingSeconds}
        startedAtIso={lastStateRecord.entered_at}
      />
    );
  } else if (state === "paused" || state === "ended_shift") {
    if (budget) {
      right = (
        <span className="flex shrink-0 flex-col items-end">
          <span
            className="font-mono text-sm font-semibold"
            data-testid={`task-step-timer-${stepId}`}
          >
            {formatSecondsHHMMSS(budget.step.worked_seconds)}
          </span>
          {budgetSecondaryLabel(
            stepId,
            budget,
            budget.step.worked_seconds,
            budget.step.left_seconds,
          )}
        </span>
      );
    } else {
      right = (
        <span
          className="font-mono text-xs opacity-90"
          data-testid={`task-step-timer-${stepId}`}
        >
          {totalWorkingSeconds > 0
            ? formatSecondsHHMMSS(totalWorkingSeconds)
            : "—"}
        </span>
      );
    }
  } else if (isPending && budget) {
    if (budget.step.allowance_seconds !== null) {
      right = (
        <span
          className="shrink-0 font-mono text-sm opacity-80"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          {formatDurationHM(budget.step.allowance_seconds)} budget
        </span>
      );
    } else if (
      budget.step.share_state === "no_budget" &&
      budget.step.typical_worker_seconds !== null
    ) {
      right = (
        <span
          className="shrink-0 text-xs opacity-80"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          usually ~{formatDurationHM(budget.step.typical_worker_seconds)}
        </span>
      );
    }
  }

  return (
    <ActionButtonShell
      bgClass={bgClass}
      disabled={isTransitioning}
      icon={isWorking ? "pause" : "play"}
      label={label}
      right={right}
      stepId={stepId}
      onClick={handleClick}
    />
  );
}
