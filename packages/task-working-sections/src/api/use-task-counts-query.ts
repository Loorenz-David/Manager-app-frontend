import { useQuery } from "@tanstack/react-query";

import { getTaskCounts } from "./get-task-counts";
import { quickTaskKeys } from "./quick-task-keys";

export function useTaskCountsQuery(params: {
  taskType: string;
  taskStates: string;
}) {
  return useQuery({
    queryKey: quickTaskKeys.counts(params.taskType, params.taskStates),
    queryFn: () =>
      getTaskCounts({
        task_types: params.taskType,
        task_states: params.taskStates,
      }),
  });
}
