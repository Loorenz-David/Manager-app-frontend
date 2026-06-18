import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itemUpholsteryKeys } from '@beyo/tasks';

import { pendingSeatUpholsteryKeys } from '@/features/pending-upholstery/api/pending-seat-keys';
import { taskKeys } from '@/features/tasks/api/task-keys';
import { upholsteryKeys } from '@/features/upholstery/api/upholstery-keys';

import { updateItemUpholstery } from '../api/update-item-upholstery';

export function useUpdateItemUpholstery(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      void queryClient.invalidateQueries({ queryKey: pendingSeatUpholsteryKeys.all });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
