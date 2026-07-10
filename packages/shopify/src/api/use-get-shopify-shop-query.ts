import { useQuery } from "@tanstack/react-query";

import { getShopifyShop } from "./get-shopify-shop";
import { shopifyKeys } from "./shopify-keys";

export function useGetShopifyShopQuery(
  shopIntegrationId: string | null | undefined,
) {
  return useQuery({
    queryKey: shopIntegrationId
      ? shopifyKeys.shopDetail(shopIntegrationId)
      : shopifyKeys.missing(),
    queryFn: () => {
      if (!shopIntegrationId) {
        throw new Error("Shopify shop integration id is required.");
      }

      return getShopifyShop(shopIntegrationId);
    },
    enabled: Boolean(shopIntegrationId),
  });
}
