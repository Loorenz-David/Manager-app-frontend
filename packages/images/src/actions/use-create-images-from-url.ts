import { useMutation } from "@tanstack/react-query";

import { createImagesFromUrl } from "../api/create-images-from-url";

export function useCreateImagesFromUrl() {
  return useMutation({
    mutationFn: createImagesFromUrl,
  });
}
