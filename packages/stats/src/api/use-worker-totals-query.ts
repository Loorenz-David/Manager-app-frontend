import { useQuery } from "@tanstack/react-query";

import { fetchWorkerTotals } from "./fetch-worker-totals";
import { workerStatsKeys } from "./worker-stats-keys";
import type { ListWorkerTotalsParams } from "../types";

export function useWorkerTotalsQuery(params: ListWorkerTotalsParams = {}) {
  return useQuery({
    queryKey: workerStatsKeys.totalsList(params),
    queryFn: () => fetchWorkerTotals(params),
    placeholderData: (previousData) => previousData,
  });
}
