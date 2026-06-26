import { Pause, Play } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { formatSecondsHHMMSS } from "../../domain/formatSecondsHHMMSS";
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

export function TaskStepCircularActionButton({
  stepId,
  taskId,
  state,
  lastStateRecord,
  totalWorkingSeconds,
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

      <div className="h-5">
        {isWorking && lastStateRecord ? (
          <TickingTimer
            className="font-mono text-sm text-muted-foreground"
            data-testid={`task-step-circular-timer-${stepId}`}
            offsetSeconds={totalWorkingSeconds}
            startedAtIso={lastStateRecord.entered_at}
          />
        ) : state === "paused" || state === "ended_shift" ? (
          <span
            className="font-mono text-sm text-muted-foreground"
            data-testid={`task-step-circular-timer-${stepId}`}
          >
            {totalWorkingSeconds > 0
              ? formatSecondsHHMMSS(totalWorkingSeconds)
              : "—"}
          </span>
        ) : null}
      </div>

      {/* <span className="text-sm text-muted-foreground">{label}</span> */}
    </div>
  );
}
