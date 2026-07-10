import { useQuery } from "@tanstack/react-query";

import type { ListShopifyShopsParams } from "../types";
import { listShopifyShops } from "./list-shopify-shops";
import { shopifyKeys } from "./shopify-keys";

export function useListShopifyShopsQuery(
  params: ListShopifyShopsParams = {},
) {
  return useQuery({
    queryKey: shopifyKeys.shopsList(params),
    queryFn: () => listShopifyShops(params),
  });
}
