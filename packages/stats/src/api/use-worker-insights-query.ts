import { useQuery } from "@tanstack/react-query";

import { fetchWorkerInsights } from "./fetch-worker-insights";
import { workerStatsKeys } from "./worker-stats-keys";
import type { ListWorkerInsightsParams } from "../types";

export function useWorkerInsightsQuery(
  params: ListWorkerInsightsParams = {},
) {
  return useQuery({
    queryKey: workerStatsKeys.insightsList(params),
    queryFn: () => fetchWorkerInsights(params),
    placeholderData: (previousData) => previousData,
  });
}
