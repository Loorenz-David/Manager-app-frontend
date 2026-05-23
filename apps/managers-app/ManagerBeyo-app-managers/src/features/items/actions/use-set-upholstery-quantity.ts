import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';

import { setItemUpholsteryQuantity } from '../api/set-item-upholstery-quantity';

export function useSetUpholsteryQuantity(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setItemUpholsteryQuantity,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
