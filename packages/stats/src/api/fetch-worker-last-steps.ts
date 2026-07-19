import { apiClient } from "@beyo/api-client";

import {
  WorkerLastStepsResponseSchema,
  type ListWorkerLastStepsParams,
} from "../types";

export type WorkerLastStepsPage = {
  workers: Awaited<ReturnType<typeof fetchWorkerLastSteps>>["workers"];
  hasMore: boolean;
  total: number;
  limit: number;
  offset: number;
};

export async function fetchWorkerLastSteps(
  params: ListWorkerLastStepsParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/worker-stats/last-interacted-steps",
    WorkerLastStepsResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      ...(params.workDate ? { work_date: params.workDate } : {}),
    },
  );
  const { workers, workers_pagination: pagination } = response.data;

  return {
    workers,
    hasMore: pagination.has_more,
    total: pagination.total,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}
