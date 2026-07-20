import { useQuery } from "@tanstack/react-query";

import { fetchWorkerLinearTimeline } from "./fetch-worker-linear-timeline";
import { workerStatsKeys } from "./worker-stats-keys";
import type { ListWorkerLinearTimelineParams } from "../types";

export function useWorkerLinearTimelineQuery(
  params: ListWorkerLinearTimelineParams = {},
) {
  return useQuery({
    queryKey: workerStatsKeys.linearTimelineList(params),
    queryFn: () => fetchWorkerLinearTimeline(params),
    placeholderData: (previousData) => previousData,
  });
}
