import { useMutation } from "@tanstack/react-query";
import type { ApiCallOptions } from "@beyo/api-client";

import { createImagesFromUrl } from "../api/create-images-from-url";
import type { CreateImageFromUrlBatch } from "../types";

/**
 * `options.activity` classifies every request this instance sends; pass
 * `"background"` when it serves an automatic path (a lookup prefill).
 */
export function useCreateImagesFromUrl(options: ApiCallOptions = {}) {
  const { activity } = options;
  return useMutation({
    mutationFn: (payload: CreateImageFromUrlBatch) =>
      createImagesFromUrl(payload, activity ? { activity } : undefined),
  });
}
