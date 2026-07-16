import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { fetchWorkerDailySteps } from "./fetch-worker-daily-steps";
import { workerStatsKeys } from "./worker-stats-keys";
import type { WorkerGranularityIntention } from "../types";

const PAGE_LIMIT = 50;

export type UseWorkerDailyStepsQueryInput = {
  userId: string;
  intention: WorkerGranularityIntention;
  workDate?: string;
};

export function useWorkerDailyStepsQuery({
  userId,
  intention,
  workDate,
}: UseWorkerDailyStepsQueryInput) {
  const query = useInfiniteQuery({
    queryKey: workerStatsKeys.dailyStepsList(userId, { intention, workDate }),
    queryFn: ({ pageParam }) =>
      fetchWorkerDailySteps({
        userId,
        intention,
        workDate,
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
