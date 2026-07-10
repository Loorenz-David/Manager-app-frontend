import { useQuery } from "@tanstack/react-query";

import { getShopifyScopeStatuses } from "./get-shopify-scope-statuses";
import { shopifyKeys } from "./shopify-keys";

export function useGetShopifyScopeStatusesQuery(
  shopIntegrationId: string | null | undefined,
) {
  return useQuery({
    queryKey: shopIntegrationId
      ? shopifyKeys.scopeStatuses({ shopIntegrationId })
      : shopifyKeys.missing(),
    queryFn: () => {
      if (!shopIntegrationId) {
        throw new Error("Shopify shop integration id is required.");
      }

      return getShopifyScopeStatuses({
        shop_integration_id: shopIntegrationId,
      });
    },
    enabled: Boolean(shopIntegrationId),
  });
}
