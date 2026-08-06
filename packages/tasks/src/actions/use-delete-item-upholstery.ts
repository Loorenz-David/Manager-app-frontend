import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteItemUpholstery } from "@beyo/items";
import { upholsteryKeys } from "@beyo/upholstery";

import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { taskKeys } from "../api/task-keys";

export function useDeleteItemUpholstery(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      // The cancelled requirement returns its meters to the inventory, so the
      // picker's stock figures are stale until refetched.
      void queryClient.invalidateQueries({
        queryKey: upholsteryKeys.pickerLists(),
      });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
