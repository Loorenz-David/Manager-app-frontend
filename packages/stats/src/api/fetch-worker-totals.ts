import { apiClient } from "@beyo/api-client";

import {
  WORK_DATE_RANGE_PARAMS,
  WorkerTotalsResponseSchema,
  type ListWorkerTotalsParams,
} from "../types";

export type WorkerTotalsPage = {
  workers: Awaited<ReturnType<typeof fetchWorkerTotals>>["workers"];
  hasMore: boolean;
  total: number;
  limit: number;
  offset: number;
};

export async function fetchWorkerTotals(params: ListWorkerTotalsParams = {}) {
  const response = await apiClient.get(
    "/api/v1/worker-stats/totals",
    WorkerTotalsResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      ...(params.timeStrategy ? { time_strategy: params.timeStrategy } : {}),
      ...(params.dateFrom && params.dateTo
        ? {
            [WORK_DATE_RANGE_PARAMS.from]: params.dateFrom,
            [WORK_DATE_RANGE_PARAMS.to]: params.dateTo,
          }
        : {}),
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
