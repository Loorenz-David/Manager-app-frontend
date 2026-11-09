import { useQuery } from "@tanstack/react-query";

import { isShopifyItemProductSyncInFlight } from "../lib/map-shopify-item-product-to-form-values";
import { getShopifyItemProduct } from "./get-shopify-item-product";
import { shopifyKeys } from "./shopify-keys";

const IN_FLIGHT_REFETCH_MS = 3_000;

export function useShopifyItemProductQuery(itemClientId: string) {
  return useQuery({
    queryKey: shopifyKeys.itemProduct(itemClientId),
    queryFn: () => getShopifyItemProduct(itemClientId),
    enabled: itemClientId.length > 0,
    // Always read Shopify fresh when the form opens; the product may have been
    // edited elsewhere since the last read.
    staleTime: 0,
    refetchOnWindowFocus: false,
    // While a save is still being processed by the Shopify worker, poll until it settles.
    refetchInterval: (query) =>
      query.state.data && isShopifyItemProductSyncInFlight(query.state.data)
        ? IN_FLIGHT_REFETCH_MS
        : false,
  });
}
