import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateItemUpholstery } from "@beyo/items";
import { upholsteryKeys } from "@beyo/upholstery";

import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { taskKeys } from "../api/task-keys";

export function useUpdateItemUpholstery(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
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
