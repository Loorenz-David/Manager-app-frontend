import { ApiRequestError } from "@beyo/api-client";
import type { TaskId } from "@beyo/lib";

import { useTaskProductionTimeQuery } from "../api/use-task-production-time-query";
import { useProductionTimeClock } from "../hooks/use-production-time-clock";
import { toProductionTimeViewModel } from "../lib/production-time-dto";

export function useProductionTimeController(taskId: string) {
  const query = useTaskProductionTimeQuery(taskId as TaskId);
  const hasWorkingSection = Boolean(
    query.data?.sections.some((section) => section.state === "working"),
  );
  const nowMs = useProductionTimeClock(hasWorkingSection);
  const viewModel = query.data
    ? toProductionTimeViewModel(query.data, nowMs)
    : null;
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
