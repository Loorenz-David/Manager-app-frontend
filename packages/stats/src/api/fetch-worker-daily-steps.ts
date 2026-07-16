import { apiClient } from "@beyo/api-client";

import {
  INTENTION_SORT_BY,
  WorkerDailyStepsResponseSchema,
  type ListWorkerDailyStepsParams,
} from "../types";

export type WorkerDailyStepsPage = Awaited<
  ReturnType<typeof fetchWorkerDailySteps>
>;

export async function fetchWorkerDailySteps(params: ListWorkerDailyStepsParams) {
  const { userId, intention, limit = 50, offset = 0, workDate } = params;

  const response = await apiClient.get(
    `/api/v1/worker-stats/${userId}/daily-steps`,
    WorkerDailyStepsResponseSchema,
    {
      sort_by: INTENTION_SORT_BY[intention],
      order: "desc",
      limit,
      offset,
      ...(workDate ? { work_date: workDate } : {}),
    },
  );

  const { user, work_date, totals, daily_stats, steps } = response.data;

  return {
    user,
    workDate: work_date,
    totals,
    dailyStats: daily_stats,
    items: steps.items,
    hasMore: steps.has_more,
    limit: steps.limit,
    offset: steps.offset,
  };
}
