import { useQuery } from "@tanstack/react-query";

import { fetchWorkerLinearTimelineBreakdown } from "./fetch-worker-linear-timeline-breakdown";
import { workerStatsKeys } from "./worker-stats-keys";
import type { GetWorkerLinearTimelineBreakdownParams } from "../types";

type Options = {
  enabled?: boolean;
  // Windows containing today refresh periodically so open blocks reconcile
  // with the backend instead of relying on client-side extrapolation forever.
  refetchInterval?: number | false;
};

export function useWorkerLinearTimelineBreakdownQuery(
  params: GetWorkerLinearTimelineBreakdownParams,
  options: Options = {},
) {
  return useQuery({
    queryKey: workerStatsKeys.linearTimelineBreakdown(params.userId, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryFn: () => fetchWorkerLinearTimelineBreakdown(params),
    // Keep the previous window painted while the next one loads.
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? false,
  });
}
