import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateItem } from "@beyo/items";
import { notify } from "@beyo/lib";

import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

export function useUpdateItem(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId);

  return useMutation({
    mutationFn: updateItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);

      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old?.item) return old;
        const { id: _id, ...changes } = input;
        return {
          ...old,
          item: {
            ...old.item,
            ...changes,
          },
        };
      });

      return { snapshot };
    },
    onError: (error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }

      notify.error(
        "Item not saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
