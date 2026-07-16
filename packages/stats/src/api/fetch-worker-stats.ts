import { apiClient } from "@beyo/api-client";

import {
  WorkerStatsResponseSchema,
  type ListWorkerStatsParams,
} from "../types";

export type WorkerStatsPage = {
  workers: Awaited<ReturnType<typeof fetchWorkerStats>>["workers"];
  hasMore: boolean;
  total: number;
  limit: number;
  offset: number;
};

export async function fetchWorkerStats(
  params: ListWorkerStatsParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/worker-stats/last-interacted-steps",
    WorkerStatsResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
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
