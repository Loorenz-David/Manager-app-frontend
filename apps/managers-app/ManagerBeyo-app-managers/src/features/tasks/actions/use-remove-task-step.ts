import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { removeTaskStep } from '../api/remove-task-step';

export type RemoveTaskStepVariables = {
  step_id: string;
};

type RemoveTaskStepContext = {
  snapshot: TaskDetailRaw | undefined;
};

export function useRemoveTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveTaskStepVariables) => removeTaskStep({ ...input, task_id: taskId }),
    onMutate: async (input): Promise<RemoveTaskStepContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          task_steps: old.task_steps.filter((step) => step.client_id !== input.step_id),
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
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
