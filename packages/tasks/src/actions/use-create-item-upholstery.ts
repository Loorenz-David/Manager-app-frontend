import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createItemUpholstery } from "@beyo/items";
import { upholsteryKeys } from "@beyo/upholstery";

import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { taskKeys } from "../api/task-keys";

export function useCreateItemUpholstery(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId);

  return useMutation({
    mutationFn: createItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: upholsteryKeys.pickerLists(),
      });
      void queryClient.invalidateQueries({
        queryKey: ["upholstery-categories"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["upholstery-inventories"],
      });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
