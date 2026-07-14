import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { getShopifyMetafieldPreferences } from "./get-shopify-metafield-preferences";
import { shopifyKeys } from "./shopify-keys";
import type { ShopifyMetafieldPreferencesResponse } from "../types";

function nextSearchOffset(
  page: ShopifyMetafieldPreferencesResponse,
): number | undefined {
  const shopWithMore = page.shops.find(
    (shop) => shop.search_pagination.has_more,
  );
  return shopWithMore?.search_pagination.next_offset ?? undefined;
}

// Even when the caller sends no `q`, the backend runs an implicit definition
// search for any shop+category pair with zero saved preferences, and that
// implicit search paginates the same way a real search does.
export function useShopifyMetafieldPreferencesCategoryQuery({
  shopIntegrationIds,
  itemCategoryId,
  enabled = true,
}: {
  shopIntegrationIds: string[];
  itemCategoryId: string | null;
  enabled?: boolean;
}) {
  const itemCategoryIds = itemCategoryId ? [itemCategoryId] : [];
  return useInfiniteQuery({
    queryKey: shopifyKeys.metafieldPreferencesCategoryInfinite({
      shopIntegrationIds,
      itemCategoryIds,
    }),
    queryFn: ({ pageParam }) =>
      getShopifyMetafieldPreferences({
        shopIntegrationIds,
        itemCategoryIds,
        searchOffset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: nextSearchOffset,
    enabled:
      enabled && shopIntegrationIds.length > 0 && itemCategoryIds.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useShopifyMetafieldPreferencesSearchInfiniteQuery({
  shopIntegrationIds,
  q,
  enabled = true,
}: {
  shopIntegrationIds: string[];
  q: string;
  enabled?: boolean;
}) {
  const normalizedQuery = q.trim();
  return useInfiniteQuery({
    queryKey: shopifyKeys.metafieldPreferencesSearchInfinite({
      shopIntegrationIds,
      q: normalizedQuery,
    }),
    queryFn: ({ pageParam }) =>
      getShopifyMetafieldPreferences({
        shopIntegrationIds,
        q: normalizedQuery,
        searchOffset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: nextSearchOffset,
    enabled:
      enabled && shopIntegrationIds.length > 0 && normalizedQuery.length > 0,
    placeholderData: keepPreviousData,
  });
}
