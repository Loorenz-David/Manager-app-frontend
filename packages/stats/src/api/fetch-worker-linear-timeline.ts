import { apiClient } from "@beyo/api-client";

import {
  WORK_DATE_RANGE_PARAMS,
  WorkerLinearTimelineResponseSchema,
  type ListWorkerLinearTimelineParams,
} from "../types";

export type WorkerLinearTimelinePage = {
  workers: Awaited<ReturnType<typeof fetchWorkerLinearTimeline>>["workers"];
  hasMore: boolean;
  total: number;
  limit: number;
  offset: number;
};

export async function fetchWorkerLinearTimeline(
  params: ListWorkerLinearTimelineParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/worker-stats/linear-timeline",
    WorkerLinearTimelineResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
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
