import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createImagesFromUrl } from "../api/create-images-from-url";
import type { CreateImageFromUrlBatch } from "../types";

function getEntityImageListKeys(payload: CreateImageFromUrlBatch) {
  const uniqueEntityClientIds = Array.from(
    new Set(payload.map((item) => item.entity_client_id)),
  );

  return uniqueEntityClientIds.map((entityClientId) => [
    "images",
    "list",
    { entity_type: "item", entity_client_id: entityClientId },
  ] as const);
}

export function useCreateImagesFromUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createImagesFromUrl,
    onSettled: (_data, _error, payload) => {
      for (const queryKey of getEntityImageListKeys(payload)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
