import { useQuery } from "@tanstack/react-query";

import type { ShopifyCustomerLookupParams } from "../types";
import { fetchShopifyCustomerLookup } from "./fetch-shopify-customer-lookup";
import { shopifyCustomerLookupKeys } from "./shopify-customer-lookup-keys";

export function useShopifyCustomerLookupQuery(
  params: ShopifyCustomerLookupParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: shopifyCustomerLookupKeys.lookup(params),
    queryFn: () => fetchShopifyCustomerLookup(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
