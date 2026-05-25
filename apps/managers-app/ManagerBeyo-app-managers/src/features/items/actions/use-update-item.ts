import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { updateItem } from '../api/update-item';

export function useUpdateItem(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: updateItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);

      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old?.item) return old;
        const { id: _id, ...changes } = input;
        return {
          ...old,
          item: {
            ...old.item,
            ...changes,
          },
        };
      });

      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
