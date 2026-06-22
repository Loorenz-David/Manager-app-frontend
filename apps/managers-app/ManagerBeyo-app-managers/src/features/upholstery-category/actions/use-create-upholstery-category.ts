import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateUpholsteryCategoryPayload } from "../types";
import { createUpholsteryCategory } from "../api/create-upholstery-category";
import { upholsteryCategoryKeys } from "../api/upholstery-category-keys";

export function useCreateUpholsteryCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUpholsteryCategoryPayload) =>
      createUpholsteryCategory(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: upholsteryCategoryKeys.lists(),
      });
    },
  });
}
