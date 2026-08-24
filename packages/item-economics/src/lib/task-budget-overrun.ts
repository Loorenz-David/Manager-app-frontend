import { formatWorkSeconds } from "./production-time-view-model";
import type { TaskBudgetAllocation } from "../types";

export type TaskBudgetOverrunViewModel = {
  overrunSeconds: number;
  label: string;
};

function decimalMinutesToSeconds(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.round(minutes * 60) : null;
}

/**
 * Task-level overrun read straight off the served `remaining_worker_minutes`
 * — no step summation needed, since the task row already carries its own
 * allowed/actual/remaining figures (budget-allocations handoff §3). Null
 * whenever the task has no usable budget (status outside `ok`/`infeasible`,
 * handoff §5 nullability table) or is still within it.
 */
export function buildTaskBudgetOverrun(
  allocation: Pick<TaskBudgetAllocation, "remaining_worker_minutes">,
): TaskBudgetOverrunViewModel | null {
  const remainingSeconds = decimalMinutesToSeconds(
    allocation.remaining_worker_minutes,
  );

  if (remainingSeconds === null || remainingSeconds >= 0) {
    return null;
  }

  const overrunSeconds = -remainingSeconds;
  return {
    overrunSeconds,
    label: `Over budget by ${formatWorkSeconds(overrunSeconds)}`,
  };
}
