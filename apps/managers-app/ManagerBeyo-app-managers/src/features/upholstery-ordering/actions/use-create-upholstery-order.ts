import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryInventoryKeys, upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";

import { createUpholsteryOrder } from "../api/fetch-upholstery-ordering";
import { upholsteryOrderingKeys } from "../api/upholstery-ordering-keys";
import type { CreateUpholsteryOrderInput } from "../types";

export function useCreateUpholsteryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUpholsteryOrder,
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

export type CreateOrderMutationInput = CreateUpholsteryOrderInput;
