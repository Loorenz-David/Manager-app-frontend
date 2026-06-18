import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itemUpholsteryKeys } from '@beyo/tasks';

import { taskKeys } from '@/features/tasks/api/task-keys';
import { upholsteryKeys } from '@/features/upholstery/api/upholstery-keys';
import { pendingSeatUpholsteryKeys } from '@/features/pending-upholstery/api/pending-seat-keys';
import { invalidateAfterInventoryMutation } from '@/features/upholstery-inventory/lib/invalidate-inventory';
import type { PendingSeatTasksPage } from '@/features/pending-upholstery/api/fetch-pending-seat-tasks';
import type { PendingSeatCounts } from '@/features/pending-upholstery/types';

import { setItemUpholsteryQuantity } from '../api/set-item-upholstery-quantity';

export function useSetUpholsteryQuantity(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: setItemUpholsteryQuantity,
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: pendingSeatUpholsteryKeys.lists(),
      });
      await queryClient.cancelQueries({
        queryKey: pendingSeatUpholsteryKeys.counts(),
      });

      const previousLists = queryClient.getQueriesData<PendingSeatTasksPage>({
        queryKey: pendingSeatUpholsteryKeys.lists(),
      });
      const previousCounts = queryClient.getQueryData<PendingSeatCounts>(
        pendingSeatUpholsteryKeys.counts(),
      );

      previousLists.forEach(([queryKey]) => {
        queryClient.setQueryData<PendingSeatTasksPage>(queryKey, (old) =>
          old
            ? {
                ...old,
                items: old.items.filter(
                  (row) => row.task.client_id !== taskId,
                ),
              }
            : old,
        );
      });

      queryClient.setQueryData<PendingSeatCounts>(
        pendingSeatUpholsteryKeys.counts(),
        (old) =>
          old
            ? {
                ...old,
                missing_quantity_total: Math.max(
                  old.missing_quantity_total - 1,
                  0,
                ),
              }
            : old,
      );

      return { previousLists, previousCounts };
    },
    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData(
        pendingSeatUpholsteryKeys.counts(),
        context?.previousCounts,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      void queryClient.invalidateQueries({ queryKey: pendingSeatUpholsteryKeys.all });
      invalidateAfterInventoryMutation(queryClient);
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
