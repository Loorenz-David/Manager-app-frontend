import { Pause, Play } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { formatSecondsHHMMSS } from "../domain/formatSecondsHHMMSS";
import { preloadPauseReasonSheetSurface } from "../surfaces";
import {
  STEP_QUICK_TRANSITION,
  type LastStateRecord,
  type StepState,
} from "../types";

type TaskStepActionButtonProps = {
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

export function TaskStepActionButton({
  stepId,
  taskId,
  state,
  lastStateRecord,
  totalWorkingSeconds,
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
  const Icon = isWorking ? Pause : Play;
  const bgClass = isWorking
    ? "bg-[var(--color-soft-container)] text-foreground"
    : "bg-primary text-card";

  return (
    <button
      aria-label={label}
      className={`flex w-full items-center justify-between border-t border-border/50 px-4 py-3.5 transition-opacity ${bgClass} disabled:opacity-60`}
      data-testid={`task-step-action-button-${stepId}`}
      disabled={isTransitioning}
      type="button"
      onClick={() => onTransition(stepId, taskId, nextState)}
    >
      <span className="flex items-center gap-3">
        <Icon
          aria-hidden="true"
          className="size-5 shrink-0 fill-current stroke-none"
        />
        <span className="text-md font-medium">{label}</span>
      </span>
      {isWorking && lastStateRecord ? (
        <TickingTimer
          className="font-mono text-xs opacity-90"
          data-testid={`task-step-timer-${stepId}`}
          offsetSeconds={totalWorkingSeconds}
          startedAtIso={lastStateRecord.entered_at}
        />
      ) : state === "paused" || state === "ended_shift" ? (
        <span className="font-mono text-xs opacity-90" data-testid={`task-step-timer-${stepId}`}>
          {totalWorkingSeconds > 0
            ? formatSecondsHHMMSS(totalWorkingSeconds)
            : "—"}
        </span>
      ) : null}
    </button>
  );
}
