import { ApiRequestError } from "@beyo/api-client";
import type { TaskId } from "@beyo/lib";

import { useTaskProductionTimeQuery } from "../api/use-task-production-time-query";
import { toProductionTimeViewModel } from "../lib/production-time-dto";

export function useProductionTimeController(taskId: string) {
  const query = useTaskProductionTimeQuery(taskId as TaskId);
  // No client clock: the served values already carry the open interval, and
  // the 45-second poll is the only motion between payloads.
  const viewModel = query.data ? toProductionTimeViewModel(query.data) : null;
  const isNotFound =
    query.error instanceof ApiRequestError && query.error.status === 404;

  return {
    viewModel,
    isPending: query.isPending,
    isError: query.isError,
    isNotFound,
    refetch: query.refetch,
  };
}

export type ProductionTimeController = ReturnType<
  typeof useProductionTimeController
>;
