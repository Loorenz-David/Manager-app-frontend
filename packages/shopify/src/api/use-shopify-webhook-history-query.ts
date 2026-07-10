import { useQuery } from "@tanstack/react-query";

import type { GetShopifyWebhookHistoryParams } from "../types";
import { getShopifyWebhookHistory } from "./get-shopify-webhook-history";
import { shopifyKeys } from "./shopify-keys";

export function useShopifyWebhookHistoryQuery(
  shopIntegrationId: string | null | undefined,
  params: GetShopifyWebhookHistoryParams = {},
) {
  return useQuery({
    queryKey: shopIntegrationId
      ? shopifyKeys.webhookHistory(shopIntegrationId, params)
      : shopifyKeys.missing(),
    queryFn: () => {
      if (!shopIntegrationId) {
        throw new Error("Shopify shop integration id is required.");
      }

      return getShopifyWebhookHistory(shopIntegrationId, params);
    },
    enabled: Boolean(shopIntegrationId),
  });
}
