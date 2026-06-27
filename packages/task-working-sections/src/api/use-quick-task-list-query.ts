import { useQuery } from "@tanstack/react-query";

import { listTasks, type TaskType } from "@beyo/tasks";

import { quickTaskKeys } from "./quick-task-keys";

type UseQuickTaskListQueryParams = {
  taskType: TaskType;
  taskStates: string;
  limit?: number;
};

export function useQuickTaskListQuery({
  taskType,
  taskStates,
  limit = 50,
}: UseQuickTaskListQueryParams) {
  return useQuery({
    queryKey: quickTaskKeys.list(taskType, taskStates, limit),
    queryFn: () =>
      listTasks({
        limit,
        task_types: taskType,
        task_states: taskStates,
      }),
  });
}
