import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";
import {
  itemUpholsteryKeys,
  setItemUpholsteryAmount,
  taskKeys,
  type SetItemUpholsteryAmountInput,
} from "@beyo/tasks";

import { upholsteryInventoryKeys } from "@/features/upholstery-inventory/api/upholstery-inventory-keys";
import { upholsteryKeys } from "@beyo/upholstery";

import type { PendingSeatTasksPage } from "../api/fetch-pending-seat-tasks";
import { pendingSeatUpholsteryKeys } from "../api/pending-seat-keys";
import type { PendingSeatCounts } from "../types";

type PendingSetAmountInput = SetItemUpholsteryAmountInput & {
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

export function usePendingUpholsterySetAmount(itemId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PendingSetAmountInput) =>
      setItemUpholsteryAmount({
        itemUpholsteryId: input.itemUpholsteryId,
        amount_meters: input.amount_meters,
      }),
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
        if (params?.missing_quantity && !params.missing_selection) {
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
    onSettled: (_data, _error, input) => {
      // Let the surface finish closing and the row finish animating out
      // before the refetch storm hits the list underneath.
      runWhenUiSettled(() => {
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
        void queryClient.invalidateQueries({
          queryKey: upholsteryInventoryKeys.lists(),
        });
        if (itemId) {
          void queryClient.invalidateQueries({
            queryKey: itemUpholsteryKeys.byItem(itemId),
          });
        }
      });
    },
  });
}
