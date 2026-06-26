import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItemPositions } from "@beyo/items";

import { taskKeys } from "@/features/tasks/api/task-keys";
import type { TaskDetailRaw } from "@/features/tasks/types";

type UpdateItemPositionInput = {
  id: string;
  item_position: string | null;
};

export function useUpdateItemPosition(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId as never);

  return useMutation({
    mutationFn: ({ id, item_position }: UpdateItemPositionInput) =>
      updateItemPositions([{ client_id: id, item_position }]),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);

      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old?.item) {
          return old;
        }

        return {
          ...old,
          item: {
            ...old.item,
            item_position: input.item_position,
          },
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
    },
  });
}
