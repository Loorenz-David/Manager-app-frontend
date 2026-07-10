import { useMutation, useQueryClient } from "@tanstack/react-query";

import { disconnectShopifyShop } from "../api/disconnect-shopify-shop";
import { shopifyKeys } from "../api/shopify-keys";

export function useDisconnectShopifyShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectShopifyShop,
    onSettled: (_data, _error, shopIntegrationId) => {
      void queryClient.invalidateQueries({ queryKey: shopifyKeys.shops() });
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.webhookHistoryRoot(shopIntegrationId),
      });
    },
  });
}
