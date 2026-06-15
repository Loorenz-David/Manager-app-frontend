import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import {
  createItemUpholstery,
  type CreateItemUpholsteryInput,
} from "@/features/items/api/create-item-upholstery";
import { taskKeys } from "@/features/tasks/api/task-keys";
import { upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";

import type { PendingSeatTasksPage } from "../api/fetch-pending-seat-tasks";
import { pendingSeatUpholsteryKeys } from "../api/pending-seat-keys";
import type { PendingSeatCounts } from "../types";

type PendingCreateInput = CreateItemUpholsteryInput & {
  taskId: string;
};

function removeTask(
  page: PendingSeatTasksPage | undefined,
  taskId: string,
): PendingSeatTasksPage | undefined {
  if (!page) return page;
  return {
    ...page,
    items: page.items.filter((row) => row.task.client_id !== taskId),
  };
}

export function usePendingUpholsteryCreate(itemId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId: _taskId, ...input }: PendingCreateInput) =>
      createItemUpholstery(input),
    onMutate: async (input) => {
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
        const params = queryKey[2] as
          | { missing_selection?: boolean; missing_quantity?: boolean }
          | undefined;
        if (params?.missing_selection && !params.missing_quantity) {
          queryClient.setQueryData<PendingSeatTasksPage>(queryKey, (old) =>
            removeTask(old, input.taskId),
          );
        }
      });

      queryClient.setQueryData<PendingSeatCounts>(
        pendingSeatUpholsteryKeys.counts(),
        (old) =>
          old
            ? {
                ...old,
                missing_selection_total: Math.max(
                  old.missing_selection_total - 1,
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
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: pendingSeatUpholsteryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(input.taskId as never),
      });
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
