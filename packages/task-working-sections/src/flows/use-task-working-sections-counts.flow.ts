import {
  useTaskStepCountsQuery,
  type TaskStepCountsByState,
} from "@beyo/tasks";

export type TaskWorkingSectionsCountsFlow = {
  assignedCount: number;
  completedCount: number;
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

  if (!query.data) {
    return {
      assignedCount: 0,
      completedCount: 0,
      isPending: query.isPending,
      isError: query.isError,
    };
  }

  return {
    assignedCount: sumCounts(query.data),
    completedCount: terminalCount(query.data),
    isPending: false,
    isError: false,
  };
}
