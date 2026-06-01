import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itemUpholsteryKeys } from '@beyo/tasks';

import { taskKeys } from '@/features/tasks/api/task-keys';
import { upholsteryKeys } from '@/features/upholstery/api/upholstery-keys';

import { setItemUpholsteryQuantity } from '../api/set-item-upholstery-quantity';

export function useSetUpholsteryQuantity(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: setItemUpholsteryQuantity,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
