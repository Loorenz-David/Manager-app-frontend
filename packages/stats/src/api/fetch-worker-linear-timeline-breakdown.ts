import { apiClient } from "@beyo/api-client";

import {
  WORK_DATE_RANGE_PARAMS,
  WorkerLinearTimelineBreakdownResponseSchema,
  type GetWorkerLinearTimelineBreakdownParams,
} from "../types";

export async function fetchWorkerLinearTimelineBreakdown(
  params: GetWorkerLinearTimelineBreakdownParams,
) {
  const response = await apiClient.get(
    `/api/v1/worker-stats/${params.userId}/linear-timeline`,
    WorkerLinearTimelineBreakdownResponseSchema,
    {
      [WORK_DATE_RANGE_PARAMS.from]: params.dateFrom,
      [WORK_DATE_RANGE_PARAMS.to]: params.dateTo,
    },
  );

  return response.data;
}

export type WorkerLinearTimelineBreakdown = Awaited<
  ReturnType<typeof fetchWorkerLinearTimelineBreakdown>
>;
