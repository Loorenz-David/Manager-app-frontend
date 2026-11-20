import { useQuery } from "@tanstack/react-query";

import { formatSkuDateCode } from "../lib/format-sku-date-code";
import { getItemSkuSuggestion } from "./get-item-sku-suggestion";
import { shopifyKeys } from "./shopify-keys";

export function useItemSkuSuggestionQuery({
  itemCategoryId,
  enabled,
}: {
  itemCategoryId: string | null;
  enabled: boolean;
}) {
  const dateCode = formatSkuDateCode();
  return useQuery({
    queryKey: shopifyKeys.skuSuggestion(itemCategoryId ?? "", dateCode),
    queryFn: () =>
      getItemSkuSuggestion({ itemCategoryId: itemCategoryId ?? "", dateCode }),
    enabled: enabled && Boolean(itemCategoryId),
    // The number depends on what was saved moments ago; always ask again.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
