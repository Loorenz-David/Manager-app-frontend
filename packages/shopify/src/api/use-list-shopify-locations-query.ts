import { useQuery } from "@tanstack/react-query";

import { listShopifyLocations } from "./list-shopify-locations";
import { shopifyKeys } from "./shopify-keys";

export function useListShopifyLocationsQuery(shopIntegrationIds: string[]) {
  const normalizedIds = [...shopIntegrationIds].sort();
  return useQuery({
    queryKey: shopifyKeys.locations({ shopIntegrationIds: normalizedIds }),
    queryFn: () => listShopifyLocations(normalizedIds),
    enabled: normalizedIds.length > 0,
    staleTime: 60_000,
  });
}
