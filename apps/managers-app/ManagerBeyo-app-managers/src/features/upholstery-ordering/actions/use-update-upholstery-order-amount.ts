import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runWhenUiSettled } from "@beyo/ui";
import { itemUpholsteryKeys } from "@beyo/tasks";
import { upholsteryKeys } from "@beyo/upholstery";

import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryInventoryKeys } from "@/features/upholstery-inventory/api/upholstery-inventory-keys";

import { updateUpholsteryOrderAmount } from "../api/fetch-upholstery-ordering";
import { upholsteryOrderingKeys } from "../api/upholstery-ordering-keys";
import type {
  OrderRow,
  PaginatedRows,
  UpdateUpholsteryOrderAmountResponse,
} from "../types";

export function patchOrderAmount(
  page: PaginatedRows<OrderRow> | undefined,
  response: UpdateUpholsteryOrderAmountResponse,
): PaginatedRows<OrderRow> | undefined {
  if (!page) return page;
  return {
    ...page,
    items: page.items.map((row) =>
      row.client_id === response.client_id
        ? {
            ...row,
            state: response.state,
            order_amount_meters: response.order_amount_meters,
            received_amount_meters: response.received_amount_meters,
          }
        : row,
    ),
  };
}

/**
 * Changes an order's amount. The backend re-allocates `ordered` / `needs_ordering`
 * requirements, so beyond the order row itself every surface that shows requirement
 * states or shortage amounts is refreshed — the same set receiving an order refreshes.
 */
export function useUpdateUpholsteryOrderAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUpholsteryOrderAmount,
    onSuccess: (response) => {
      // The order detail header reads this cache (`useLiveOrder`), so it updates at once.
      queryClient
        .getQueriesData<PaginatedRows<OrderRow>>({
          queryKey: upholsteryOrderingKeys.ordersLists(),
        })
        .forEach(([queryKey]) => {
          queryClient.setQueryData<PaginatedRows<OrderRow>>(queryKey, (old) =>
            patchOrderAmount(old, response),
          );
        });
    },
    onSettled: () => {
      runWhenUiSettled(() => {
        void queryClient.invalidateQueries({ queryKey: upholsteryOrderingKeys.all });
        void queryClient.invalidateQueries({ queryKey: itemUpholsteryKeys.all });
        void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
        void queryClient.invalidateQueries({
          queryKey: pendingSeatUpholsteryKeys.counts(),
        });
        void queryClient.invalidateQueries({
          queryKey: upholsteryInventoryKeys.lists(),
        });
        // Ordered bucket + history timeline of the inventory changed too.
        void queryClient.invalidateQueries({
          queryKey: upholsteryInventoryKeys.details(),
        });
      });
    },
  });
}
