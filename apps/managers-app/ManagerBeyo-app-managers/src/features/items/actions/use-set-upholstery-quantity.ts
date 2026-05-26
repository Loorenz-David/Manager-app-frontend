import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';
import { upholsteryKeys } from '@/features/upholstery/api/upholstery-keys';
import { useUpholsterySelectionStore } from '@/features/upholstery/store/upholstery-selection.store';

import { setItemUpholsteryQuantity } from '../api/set-item-upholstery-quantity';

export function useSetUpholsteryQuantity(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: setItemUpholsteryQuantity,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);

      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          item_upholstery: old.item_upholstery.map((entry) =>
            entry.client_id === input.itemUpholsteryId
              ? { ...entry, amount_meters: input.amount_meters }
              : entry,
          ),
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
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      useUpholsterySelectionStore.getState().clear();
    },
  });
}
