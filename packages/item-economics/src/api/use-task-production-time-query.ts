import { ApiRequestError } from "@beyo/api-client";
import type { TaskId } from "@beyo/lib";
import { useQuery } from "@tanstack/react-query";

import { fetchTaskProductionTime } from "./fetch-task-production-time";
import { itemEconomicsKeys } from "./item-economics-keys";

export function useTaskProductionTimeQuery(taskId: TaskId) {
  return useQuery({
    queryKey: itemEconomicsKeys.taskProductionTime(taskId),
    queryFn: () => fetchTaskProductionTime(taskId),
    enabled: Boolean(taskId),
    // The endpoint is a live operational projection. Poll inside the backend's
    // 30–60 second window; TanStack pauses this interval in hidden tabs.
    refetchInterval: 45_000,
    // A 404 means the host task is gone, so retrying cannot recover it. Other
    // failures get the single retry allowed by the global query policy.
    retry: (count, error) =>
      !(error instanceof ApiRequestError && error.status === 404) && count < 1,
  });
}
