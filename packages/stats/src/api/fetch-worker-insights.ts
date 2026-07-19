import { apiClient } from "@beyo/api-client";

import {
  WorkerInsightsResponseSchema,
  type ListWorkerInsightsParams,
} from "../types";

export type WorkerInsightsPage = {
  workers: Awaited<ReturnType<typeof fetchWorkerInsights>>["workers"];
  hasMore: boolean;
  total: number;
  limit: number;
  offset: number;
};

export async function fetchWorkerInsights(
  params: ListWorkerInsightsParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/worker-stats/insights",
    WorkerInsightsResponseSchema,
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
