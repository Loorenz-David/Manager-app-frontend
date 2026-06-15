import { useQuery } from "@tanstack/react-query";

import { fetchPendingSeatTaskCounts } from "./fetch-pending-seat-task-counts";
import { pendingSeatUpholsteryKeys } from "./pending-seat-keys";

export function usePendingSeatCountsQuery() {
  return useQuery({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    queryFn: fetchPendingSeatTaskCounts,
  });
}
