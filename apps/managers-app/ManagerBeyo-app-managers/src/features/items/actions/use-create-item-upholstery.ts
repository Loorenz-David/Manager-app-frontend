import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { taskKeys } from "@/features/tasks/api/task-keys";
import { upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";
import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";

import { createItemUpholstery } from "../api/create-item-upholstery";

export function useCreateItemUpholstery(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: createItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: upholsteryKeys.pickerLists(),
      });
      void queryClient.invalidateQueries({
        queryKey: pendingSeatUpholsteryKeys.all,
      });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
