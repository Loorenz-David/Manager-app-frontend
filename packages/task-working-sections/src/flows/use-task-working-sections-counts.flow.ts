import {
  useTaskStepCountsQuery,
  useTaskStepsByTaskQuery,
  type TaskStepCountsByState,
} from "@beyo/tasks";

export type TaskWorkingSectionsCountsFlow = {
  assignedCount: number;
  completedCount: number;
  totalWorkingSeconds: number;
  isPending: boolean;
  isError: boolean;
};

function sumCounts(counts: TaskStepCountsByState): number {
  return (
    counts.pending +
    counts.working +
    counts.paused +
    counts.ended_shift +
    counts.blocked +
    counts.completed +
    counts.skipped +
    counts.failed +
    counts.cancelled
  );
}

function terminalCount(counts: TaskStepCountsByState): number {
  return counts.completed + counts.skipped + counts.failed + counts.cancelled;
}

export function useTaskWorkingSectionsCountsFlow(
  taskId: string | null | undefined,
): TaskWorkingSectionsCountsFlow {
  const query = useTaskStepCountsQuery(taskId);
  const stepsQuery = useTaskStepsByTaskQuery(taskId);

  const totalWorkingSeconds = (stepsQuery.data ?? []).reduce(
    (total, step) => total + step.total_working_seconds,
    0,
  );

  if (!query.data) {
    return {
      assignedCount: 0,
      completedCount: 0,
      totalWorkingSeconds,
      isPending: query.isPending,
      isError: query.isError,
    };
  }

  return {
    assignedCount: sumCounts(query.data),
    completedCount: terminalCount(query.data),
    totalWorkingSeconds,
    isPending: false,
    isError: false,
  };
}
