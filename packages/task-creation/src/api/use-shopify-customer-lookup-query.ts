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
    // A read sent as POST and run by the query cache (mount, key change,
    // focus refetch), never by a click of its own: background activity.
    queryFn: () =>
      fetchShopifyCustomerLookup(params, { activity: "background" }),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
