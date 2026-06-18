import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setStoredAmount } from "../api/set-stored-amount";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";

export function useSetStoredAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setStoredAmount,
    onSettled: (_data, _error, variables) => {
      invalidateAfterInventoryMutation(queryClient, {
        inventoryId: variables.inventoryId,
      });
    },
  });
}
