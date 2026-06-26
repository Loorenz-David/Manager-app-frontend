import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TaskDetailRaw } from "../types";
import { taskKeys } from "../api/task-keys";
import { removeTaskStepsBatch } from "../api/remove-task-step";

export type RemoveTaskStepVariables = {
  step_ids: string[];
};

type RemoveTaskStepContext = {
  snapshot: TaskDetailRaw | undefined;
};

export function useRemoveTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveTaskStepVariables) =>
      removeTaskStepsBatch({ ...input, task_id: taskId }),
    onMutate: async (input): Promise<RemoveTaskStepContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );
      const stepIds = new Set(input.step_ids);

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          task_steps: old.task_steps.filter((step) => !stepIds.has(step.client_id)),
        };
      });

      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
