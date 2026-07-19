import { apiClient } from "@beyo/api-client";

import {
  INTENTION_SORT_BY,
  WORK_DATE_RANGE_PARAMS,
  WorkerDailyStepsResponseSchema,
  type ListWorkerDailyStepsParams,
} from "../types";

export type WorkerDailyStepsPage = Awaited<
  ReturnType<typeof fetchWorkerDailySteps>
>;

export async function fetchWorkerDailySteps(params: ListWorkerDailyStepsParams) {
  const {
    userId,
    intention,
    limit = 50,
    offset = 0,
    dateFrom,
    dateTo,
    timeStrategy,
    onlyInaccurate,
  } = params;

  const response = await apiClient.get(
    `/api/v1/worker-stats/${userId}/daily-steps`,
    WorkerDailyStepsResponseSchema,
    {
      sort_by: INTENTION_SORT_BY[intention],
      order: "desc",
      limit,
      offset,
      ...(timeStrategy ? { time_strategy: timeStrategy } : {}),
      ...(onlyInaccurate ? { only_inaccurate: true } : {}),
      ...(dateFrom && dateTo
        ? {
            [WORK_DATE_RANGE_PARAMS.from]: dateFrom,
            [WORK_DATE_RANGE_PARAMS.to]: dateTo,
          }
        : {}),
    },
  );

  const {
    user,
    work_date,
    date_from,
    date_to,
    totals,
    usable,
    wasted,
    estimated,
    inaccurate_step_count,
    time_strategy,
    daily_stats,
    steps,
  } = response.data;

  return {
    user,
    workDate: work_date ?? date_to ?? null,
    dateFrom: date_from ?? null,
    dateTo: date_to ?? null,
    // Trusted-only. `usable` (trusted + estimated fill) is what a manager reads;
    // `wasted` is diagnostic and must never be added to either.
    totals,
    usable: usable ?? totals,
    wasted: wasted ?? null,
    estimated: estimated ?? null,
    inaccurateStepCount: inaccurate_step_count,
    timeStrategy: time_strategy,
    dailyStats: daily_stats,
    items: steps.items,
    hasMore: steps.has_more,
    limit: steps.limit,
    offset: steps.offset,
  };
}
