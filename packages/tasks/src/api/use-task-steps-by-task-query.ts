import { useQuery } from "@tanstack/react-query";
import { listTaskStepsByTask } from "./list-task-steps-by-task";
import { taskStepKeys } from "./task-step-keys";

export function useTaskStepsByTaskQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId ? taskStepKeys.byTask(taskId) : taskStepKeys.missingTask(),
    queryFn: () => {
      if (!taskId) {
        throw new Error("taskId is required");
      }

      return listTaskStepsByTask(taskId);
    },
    enabled: Boolean(taskId),
  });
}
