import { useMutation, useQueryClient } from "@tanstack/react-query";

import { upholsteryInventoryKeys } from "@/features/upholstery/api/upholstery-keys";
import type { UpholsteryInventoryId } from "@/types/common";

import { deleteUpholsteryInventory } from "../api/delete-upholstery-inventory";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";

export function useDeleteUpholsteryInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUpholsteryInventory,
    onSuccess: (_data, inventoryId: UpholsteryInventoryId) => {
      void queryClient.removeQueries({
        queryKey: upholsteryInventoryKeys.detail(inventoryId),
      });
    },
    onSettled: () => {
      invalidateAfterInventoryMutation(queryClient);
    },
  });
}
