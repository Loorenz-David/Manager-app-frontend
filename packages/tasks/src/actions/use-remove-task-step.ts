import { useMutation, useQueryClient } from "@tanstack/react-query";

import { taskKeys } from "../api/task-keys";
import { taskStepKeys } from "../api/task-step-keys";
import { removeTaskStepsBatch } from "../api/remove-task-step";

export type RemoveTaskStepVariables = {
  step_ids: string[];
};

type RemoveTaskStepContext = {
  taskDetailInvalidationCancelled: true;
};

export function useRemoveTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveTaskStepVariables) =>
      removeTaskStepsBatch({ ...input, task_id: taskId }),
    onMutate: async (): Promise<RemoveTaskStepContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      return { taskDetailInvalidationCancelled: true };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.byTask(taskId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.counts(taskId),
      });
    },
  });
}
