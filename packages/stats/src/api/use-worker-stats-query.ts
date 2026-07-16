import { useQuery } from "@tanstack/react-query";

import { fetchWorkerStats } from "./fetch-worker-stats";
import { workerStatsKeys } from "./worker-stats-keys";
import type { ListWorkerStatsParams } from "../types";

export function useWorkerStatsQuery(
  params: ListWorkerStatsParams = {},
) {
  return useQuery({
    queryKey: workerStatsKeys.lastInteractedList(params),
    queryFn: () => fetchWorkerStats(params),
    placeholderData: (previousData) => previousData,
  });
}
