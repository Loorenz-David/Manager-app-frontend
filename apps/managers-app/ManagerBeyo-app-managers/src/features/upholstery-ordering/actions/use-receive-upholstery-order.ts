import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryInventoryKeys, upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";

import { receiveUpholsteryOrder } from "../api/fetch-upholstery-ordering";
import { upholsteryOrderingKeys } from "../api/upholstery-ordering-keys";
import type {
  OrderRow,
  PaginatedRows,
  ReceiveUpholsteryOrderInput,
} from "../types";

function patchOrderState(
  page: PaginatedRows<OrderRow> | undefined,
  orderId: string,
  state: OrderRow["state"],
  receivedAmountMeters: number,
): PaginatedRows<OrderRow> | undefined {
  if (!page) return page;
  return {
    ...page,
    items: page.items.map((row) =>
      row.client_id === orderId
        ? {
            ...row,
            state,
            received_amount_meters:
              (row.received_amount_meters ?? 0) + receivedAmountMeters,
          }
        : row,
    ),
  };
}

export function useReceiveUpholsteryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: receiveUpholsteryOrder,
    onSuccess: (response, variables) => {
      queryClient
        .getQueriesData<PaginatedRows<OrderRow>>({
          queryKey: upholsteryOrderingKeys.ordersLists(),
        })
        .forEach(([queryKey]) => {
          queryClient.setQueryData<PaginatedRows<OrderRow>>(queryKey, (old) =>
            patchOrderState(
              old,
              response.client_id,
              response.state,
              variables.received_amount_meters,
            ),
          );
        });
    },
    onSettled: () => {
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
    },
  });
}

export type ReceiveOrderMutationInput = ReceiveUpholsteryOrderInput;
