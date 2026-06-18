import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUpholsteryInventory } from "../api/create-upholstery-inventory";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";
import type { CreateInventoryPayload } from "../types";

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInventoryPayload) =>
      createUpholsteryInventory(payload),
    onSettled: () => {
      invalidateAfterInventoryMutation(queryClient);
    },
  });
}
