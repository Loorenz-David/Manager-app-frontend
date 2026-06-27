import { useQuery } from "@tanstack/react-query";

import { fetchTaskStepCounts } from "./fetch-task-step-counts";
import { taskStepKeys } from "./task-step-keys";

export function useTaskStepCountsQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId ? taskStepKeys.counts(taskId) : taskStepKeys.missingTask(),
    queryFn: () => {
      if (!taskId) {
        throw new Error("taskId is required");
      }

      return fetchTaskStepCounts(taskId);
    },
    enabled: Boolean(taskId),
  });
}
