import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryInventoryKeys } from "@/features/upholstery-inventory/api/upholstery-inventory-keys";
import { upholsteryKeys } from "@beyo/upholstery";

import { createUpholsteryOrder } from "../api/fetch-upholstery-ordering";
import { upholsteryOrderingKeys } from "../api/upholstery-ordering-keys";
import type {
  CreateUpholsteryOrderInput,
  OrderNeedRow,
  OrderNeedsCount,
  PaginatedRows,
} from "../types";

type NeedsPage = PaginatedRows<OrderNeedRow>;

function removeUpholstery(
  page: NeedsPage | undefined,
  upholsteryId: string,
): NeedsPage | undefined {
  if (!page) return page;
  return {
    ...page,
    items: page.items.filter((row) => row.upholstery_id !== upholsteryId),
  };
}

export function useCreateUpholsteryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUpholsteryOrder,
    // The shortage is covered the moment the order is placed, so drop its row
    // from the needs list right away — the list animates the removal.
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: upholsteryOrderingKeys.needsLists(),
      });
      await queryClient.cancelQueries({
        queryKey: upholsteryOrderingKeys.needsCount(),
      });

      const previousLists = queryClient.getQueriesData<NeedsPage>({
        queryKey: upholsteryOrderingKeys.needsLists(),
      });
      const previousCount = queryClient.getQueryData<OrderNeedsCount>(
        upholsteryOrderingKeys.needsCount(),
      );

      previousLists.forEach(([queryKey]) => {
        queryClient.setQueryData<NeedsPage>(queryKey, (old) =>
          removeUpholstery(old, input.upholstery_id),
        );
      });

      queryClient.setQueryData<OrderNeedsCount>(
        upholsteryOrderingKeys.needsCount(),
        (old) =>
          old
            ? {
                ...old,
                upholstery_count: Math.max(old.upholstery_count - 1, 0),
              }
            : old,
      );

      return { previousLists, previousCount };
    },
    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      queryClient.setQueryData(
        upholsteryOrderingKeys.needsCount(),
        context?.previousCount,
      );
    },
    onSettled: () => {
      // Let the surface finish closing and the row finish animating out
      // before the refetch storm hits the list underneath.
      runWhenUiSettled(() => {
        void queryClient.invalidateQueries({
          queryKey: upholsteryOrderingKeys.all,
        });
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.all,
        });
        void queryClient.invalidateQueries({
          queryKey: upholsteryKeys.pickerLists(),
        });
        void queryClient.invalidateQueries({
          queryKey: pendingSeatUpholsteryKeys.counts(),
        });
        void queryClient.invalidateQueries({
          queryKey: upholsteryInventoryKeys.lists(),
        });
      });
    },
  });
}

export type CreateOrderMutationInput = CreateUpholsteryOrderInput;
