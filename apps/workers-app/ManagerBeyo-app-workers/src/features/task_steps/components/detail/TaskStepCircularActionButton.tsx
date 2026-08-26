import { CircleAlert, Pause, Play } from "lucide-react";
import { cn, type TaskId, type TaskStepId } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { formatSecondsHHMMSS } from "../../domain/formatSecondsHHMMSS";
import { useLiveStepBudget, type StepBudget } from "../../domain/step-budget";
import { StepBudgetSecondaryLabel } from "../../domain/step-budget-presentation";
import { preloadPauseReasonSheetSurface } from "../../surfaces";
import {
  STEP_QUICK_TRANSITION,
  type LastStateRecord,
  type StepState,
} from "../../types";

type TaskStepCircularActionButtonProps = {
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

function labelFromState(state: StepState): string {
  if (state === "pending") {
    return "Tap to start";
  }

  if (state === "working") {
    return "Tap to pause";
  }

  return "Tap to resume";
}

type WorkingBudgetTimerProps = {
  stepId: TaskStepId;
  budget: StepBudget;
};

type DetailBudgetSecondaryLabelProps = {
  budget: StepBudget;
  leftSeconds: number | null;
  stepId: TaskStepId;
  workedSeconds: number;
};

function DetailBudgetSecondaryLabel({
  budget,
  leftSeconds,
  stepId,
  workedSeconds,
}: DetailBudgetSecondaryLabelProps): React.JSX.Element | null {
  const isOver = budget.step.allowance_seconds !== null &&
    leftSeconds !== null &&
    leftSeconds < 0;
  const label = (
    <StepBudgetSecondaryLabel
      budget={budget}
      leftSeconds={leftSeconds}
      stepId={stepId}
      workedSeconds={workedSeconds}
    />
  );

  if (!isOver) {
    return label;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[#e2a39b] bg-[#c0473a]/10 px-2 py-0.5"
      data-testid={`task-step-circular-overtime-${stepId}`}
    >
      <CircleAlert
        aria-hidden="true"
        className="size-3.5 shrink-0 text-[#b9382a]"
      />
      {label}
    </span>
  );
}

function WorkingBudgetTimer({
  stepId,
  budget,
}: WorkingBudgetTimerProps): React.JSX.Element {
  const { workedSeconds, leftSeconds, isOver } = useLiveStepBudget(budget);

  return (
    <>
      <span
        className={cn(
          "font-mono text-sm text-muted-foreground",
          isOver && "text-[#b9382a]",
        )}
        data-testid={`task-step-circular-timer-${stepId}`}
      >
        {formatSecondsHHMMSS(workedSeconds)}
      </span>
      <DetailBudgetSecondaryLabel
        budget={budget}
        leftSeconds={leftSeconds}
        stepId={stepId}
        workedSeconds={workedSeconds}
      />
    </>
  );
}

export function TaskStepCircularActionButton({
  stepId,
  taskId,
  state,
  lastStateRecord,
  totalWorkingSeconds,
  budget,
  onTransition,
  isTransitioning,
}: TaskStepCircularActionButtonProps): React.JSX.Element | null {
  const nextState = STEP_QUICK_TRANSITION[state];
  usePreloadSurface(preloadPauseReasonSheetSurface);

  if (nextState === undefined) {
    return null;
  }

  const isWorking = state === "working";
  const label = labelFromState(state);
  const Icon = isWorking ? Pause : Play;
  const bgClass = isWorking
    ? "bg-[var(--color-soft-container)] text-foreground shadow-md border border-[color:var(--color-light-border)]"
    : "bg-primary text-card shadow-md border border-[color:var(--color-light-border)]";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={label}
        className={`flex size-24 items-center justify-center rounded-full transition-opacity border border-between-border ${bgClass} disabled:opacity-60`}
        data-testid={`task-step-circular-action-${stepId}`}
        disabled={isTransitioning}
        onClick={() => onTransition(stepId, taskId, nextState)}
      >
        <Icon
          aria-hidden="true"
          className="size-8 shrink-0 fill-current stroke-none"
        />
      </button>

      <div className="flex min-h-5 flex-col items-center">
        {isWorking && budget ? (
          <WorkingBudgetTimer budget={budget} stepId={stepId} />
        ) : isWorking && lastStateRecord ? (
          <TickingTimer
            className="font-mono text-sm text-muted-foreground"
            data-testid={`task-step-circular-timer-${stepId}`}
            offsetSeconds={totalWorkingSeconds}
            startedAtIso={lastStateRecord.entered_at}
          />
        ) : state === "paused" || state === "ended_shift" ? (
          budget ? (
            <>
              <span
                className={cn(
                  "font-mono text-sm text-muted-foreground",
                  budget.step.left_seconds !== null &&
                    budget.step.left_seconds < 0 &&
                    "text-[#b9382a]",
                )}
                data-testid={`task-step-circular-timer-${stepId}`}
              >
                {formatSecondsHHMMSS(budget.step.worked_seconds)}
              </span>
              <DetailBudgetSecondaryLabel
                budget={budget}
                leftSeconds={budget.step.left_seconds}
                stepId={stepId}
                workedSeconds={budget.step.worked_seconds}
              />
            </>
          ) : (
            <span
              className="font-mono text-sm text-muted-foreground"
              data-testid={`task-step-circular-timer-${stepId}`}
            >
              {totalWorkingSeconds > 0
                ? formatSecondsHHMMSS(totalWorkingSeconds)
                : "—"}
            </span>
          )
        ) : null}
      </div>

      {/* <span className="text-sm text-muted-foreground">{label}</span> */}
    </div>
  );
}
