import { useMutation, useQueryClient } from "@tanstack/react-query";

import { upholsteryKeys } from "@beyo/upholstery";

import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { setItemUpholsteryAmount } from "../api/set-item-upholstery-amount";
import { taskKeys } from "../api/task-keys";

export function useSetItemUpholsteryAmount(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setItemUpholsteryAmount,
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
