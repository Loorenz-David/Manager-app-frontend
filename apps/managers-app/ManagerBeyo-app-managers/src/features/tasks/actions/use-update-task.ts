import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTask } from '../api/update-task';
import { taskKeys } from '../api/task-keys';
import type { TaskDetailRaw } from '../types';

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onMutate: async (input) => {
      const { id, ...changes } = input;
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(id));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(id), (old) => {
        if (!old) return old;
        return {
          ...old,
          task: {
            ...old.task,
            ...changes,
          },
        };
      });

      return { id, snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(context.id), context.snapshot);
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.id) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
