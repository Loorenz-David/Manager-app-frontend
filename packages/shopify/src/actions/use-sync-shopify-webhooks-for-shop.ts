import { useMutation, useQueryClient } from "@tanstack/react-query";

import { shopifyKeys } from "../api/shopify-keys";
import { syncShopifyWebhooksForShop } from "../api/sync-shopify-webhooks-for-shop";

export function useSyncShopifyWebhooksForShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncShopifyWebhooksForShop,
    onSettled: (_data, _error, shopIntegrationId) => {
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.shopDetail(shopIntegrationId),
      });
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.webhookHistoryRoot(shopIntegrationId),
      });
    },
  });
}
