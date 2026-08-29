import { Pause, Play } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { formatSecondsHHMMSS } from "../domain/formatSecondsHHMMSS";
import {
  formatDurationHM,
  useLiveStepBudget,
  workerFacingAllowanceForBudget,
  workerFacingTypicalSeconds,
  type StepBudget,
} from "../domain/step-budget";
import { StepBudgetSecondaryLabel } from "../domain/step-budget-presentation";
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
  right?: React.ReactNode;
};

function ActionButtonShell({
  stepId,
  label,
  icon,
  bgClass,
  disabled,
  onClick,
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
      <span className="flex min-w-0 flex-col items-start">
        <span className="flex items-center gap-3">
          <Icon
            aria-hidden="true"
            className="size-5 shrink-0 fill-current stroke-none"
          />
          <span className="text-md font-medium">{label}</span>
        </span>
      </span>
      {right}
    </button>
  );
}

type WorkingBudgetButtonProps = {
  stepId: TaskStepId;
  label: string;
  budget: StepBudget;
  disabled: boolean;
  onClick: () => void;
};

function WorkingBudgetButton({
  stepId,
  label,
  budget,
  disabled,
  onClick,
}: WorkingBudgetButtonProps): React.JSX.Element {
  const { workedSeconds, leftSeconds, isOver } = useLiveStepBudget(budget);

  return (
    <ActionButtonShell
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
          <StepBudgetSecondaryLabel
            budget={budget}
            leftSeconds={leftSeconds}
            stepId={stepId}
            workedSeconds={workedSeconds}
          />
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
          <StepBudgetSecondaryLabel
            budget={budget}
            leftSeconds={budget.step.left_seconds}
            stepId={stepId}
            workedSeconds={budget.step.worked_seconds}
          />
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
    const workerFacingAllowance = workerFacingAllowanceForBudget(budget);
    const typicalSeconds = workerFacingTypicalSeconds(budget);
    if (workerFacingAllowance !== null) {
      right = (
        <span
          className="shrink-0 font-mono text-sm opacity-80"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          {formatDurationHM(workerFacingAllowance)} assigned
        </span>
      );
    } else if (
      budget.step.share_state === "no_budget" &&
      typicalSeconds !== null
    ) {
      right = (
        <span
          className="shrink-0 text-xs opacity-80"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          usually ~{formatDurationHM(typicalSeconds)}
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
