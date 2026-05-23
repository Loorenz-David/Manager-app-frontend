import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';

import { updateItem } from '../api/update-item';

export function useUpdateItem(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItem,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
