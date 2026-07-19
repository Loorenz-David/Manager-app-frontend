import { useQuery } from "@tanstack/react-query";

import { fetchWorkerLastSteps } from "./fetch-worker-last-steps";
import { workerStatsKeys } from "./worker-stats-keys";
import type { ListWorkerLastStepsParams } from "../types";

export function useWorkerLastStepsQuery(
  params: ListWorkerLastStepsParams = {},
) {
  return useQuery({
    queryKey: workerStatsKeys.lastInteractedList(params),
    queryFn: () => fetchWorkerLastSteps(params),
    placeholderData: (previousData) => previousData,
  });
}
