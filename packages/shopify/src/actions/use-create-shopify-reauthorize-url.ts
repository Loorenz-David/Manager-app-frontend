import { useMutation } from "@tanstack/react-query";

import { createShopifyReauthorizeUrl } from "../api/create-shopify-reauthorize-url";

export function useCreateShopifyReauthorizeUrl() {
  return useMutation({
    mutationFn: createShopifyReauthorizeUrl,
  });
}
