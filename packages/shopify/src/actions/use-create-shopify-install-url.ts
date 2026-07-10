import { useMutation } from "@tanstack/react-query";

import { createShopifyInstallUrl } from "../api/create-shopify-install-url";

export function useCreateShopifyInstallUrl() {
  return useMutation({
    mutationFn: createShopifyInstallUrl,
  });
}
