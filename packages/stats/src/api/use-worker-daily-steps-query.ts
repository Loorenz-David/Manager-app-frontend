import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { fetchWorkerDailySteps } from "./fetch-worker-daily-steps";
import { workerStatsKeys } from "./worker-stats-keys";
import type { TimeStrategy, WorkerGranularityIntention } from "../types";

const PAGE_LIMIT = 50;

export type UseWorkerDailyStepsQueryInput = {
  userId: string;
  intention: WorkerGranularityIntention;
  dateFrom: string;
  dateTo: string;
  timeStrategy?: TimeStrategy;
  onlyInaccurate?: boolean;
};

export function useWorkerDailyStepsQuery({
  userId,
  intention,
  dateFrom,
  dateTo,
  timeStrategy,
  onlyInaccurate,
}: UseWorkerDailyStepsQueryInput) {
  const query = useInfiniteQuery({
    queryKey: workerStatsKeys.dailyStepsList(userId, {
      intention,
      dateFrom,
      dateTo,
      timeStrategy,
      onlyInaccurate,
    }),
    queryFn: ({ pageParam }) =>
      fetchWorkerDailySteps({
        userId,
        intention,
        dateFrom,
        dateTo,
        timeStrategy,
        onlyInaccurate,
        limit: PAGE_LIMIT,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    // Keep the previous intention's list visible while the new one refetches.
    placeholderData: keepPreviousData,
    enabled: Boolean(userId),
  });

  async function loadMore(): Promise<void> {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      await query.fetchNextPage();
    }
  }

  return {
    query,
    loadMore,
    hasMore: query.hasNextPage ?? false,
    isFetchingMore: query.isFetchingNextPage,
  };
}
