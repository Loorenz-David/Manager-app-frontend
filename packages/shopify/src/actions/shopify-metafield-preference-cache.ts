import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import { shopifyKeys } from "../api/shopify-keys";
import type {
  ShopifyMetafieldPreference,
  ShopifyMetafieldPreferencesResponse,
} from "../types";

// The category query is paginated (useInfiniteQuery), so its cache entries
// hold `{ pages, pageParams }`, not a flat response. Every page still has
// the same `{ shops }` shape, so the per-page updaters below stay flat and
// this module handles unwrapping/rewrapping the page list.
type CategoryCacheData = InfiniteData<ShopifyMetafieldPreferencesResponse>;

export type MetafieldPreferencesCacheSnapshot = Array<
  [QueryKey, CategoryCacheData | undefined]
>;

const categoryQueryKey = shopifyKeys.metafieldPreferencesCategories();

export function snapshotMetafieldPreferencesCache(
  queryClient: QueryClient,
): MetafieldPreferencesCacheSnapshot {
  return queryClient.getQueriesData<CategoryCacheData>({
    queryKey: categoryQueryKey,
  });
}

export function restoreMetafieldPreferencesCache(
  queryClient: QueryClient,
  snapshot: MetafieldPreferencesCacheSnapshot,
): void {
  snapshot.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
}

export function updateMetafieldPreferencesCaches(
  queryClient: QueryClient,
  updater: (
    data: ShopifyMetafieldPreferencesResponse,
  ) => ShopifyMetafieldPreferencesResponse,
): void {
  queryClient.setQueriesData<CategoryCacheData>(
    { queryKey: categoryQueryKey },
    (data) =>
      data ? { ...data, pages: data.pages.map((page) => updater(page)) } : data,
  );
}

function sortPreferences(
  preferences: ShopifyMetafieldPreference[],
): ShopifyMetafieldPreference[] {
  return [...preferences].sort(
    (left, right) => left.sequence_order - right.sequence_order,
  );
}

export function addMetafieldPreferenceToCache(
  queryClient: QueryClient,
  preference: ShopifyMetafieldPreference,
): void {
  updateMetafieldPreferencesCaches(queryClient, (data) => ({
    ...data,
    shops: data.shops.map((shop) => {
      if (shop.shop_integration_id !== preference.shop_integration_id) {
        return shop;
      }

      const categoryIndex = shop.item_categories.findIndex(
        (category) => category.item_category_id === preference.item_category_id,
      );
      if (categoryIndex === -1) {
        return {
          ...shop,
          item_categories: [
            ...shop.item_categories,
            {
              item_category_id: preference.item_category_id,
              metafield_preferences: [preference],
            },
          ],
        };
      }

      const itemCategories = [...shop.item_categories];
      const category = itemCategories[categoryIndex];
      if (
        category.metafield_preferences.some(
          (item) => item.client_id === preference.client_id,
        )
      ) {
        return shop;
      }
      itemCategories[categoryIndex] = {
        ...category,
        metafield_preferences: sortPreferences([
          ...category.metafield_preferences,
          preference,
        ]),
      };
      return { ...shop, item_categories: itemCategories };
    }),
  }));
}

export function replaceMetafieldPreferenceInCache(
  queryClient: QueryClient,
  preference: ShopifyMetafieldPreference,
): void {
  updateMetafieldPreferencesCaches(queryClient, (data) => ({
    ...data,
    shops: data.shops.map((shop) => ({
      ...shop,
      item_categories: shop.item_categories.map((category) => ({
        ...category,
        metafield_preferences: category.metafield_preferences.map((item) =>
          item.client_id === preference.client_id ? preference : item,
        ),
      })),
    })),
  }));
}

export function removeMetafieldPreferenceFromCache(
  queryClient: QueryClient,
  preferenceClientId: string,
): void {
  updateMetafieldPreferencesCaches(queryClient, (data) => ({
    ...data,
    shops: data.shops.map((shop) => ({
      ...shop,
      item_categories: shop.item_categories.map((category) => ({
        ...category,
        metafield_preferences: category.metafield_preferences.filter(
          (preference) => preference.client_id !== preferenceClientId,
        ),
      })),
    })),
  }));
}

export function reorderMetafieldPreferenceInCache(
  queryClient: QueryClient,
  preferenceClientId: string,
  newIndex: number,
): void {
  updateMetafieldPreferencesCaches(queryClient, (data) => ({
    ...data,
    shops: data.shops.map((shop) => ({
      ...shop,
      item_categories: shop.item_categories.map((category) => {
        const ordered = sortPreferences(category.metafield_preferences);
        const oldIndex = ordered.findIndex(
          (preference) => preference.client_id === preferenceClientId,
        );
        if (oldIndex === -1) return category;

        const nextIndex = Math.max(0, Math.min(newIndex, ordered.length - 1));
        const [moved] = ordered.splice(oldIndex, 1);
        ordered.splice(nextIndex, 0, moved);
        return {
          ...category,
          metafield_preferences: ordered.map((preference, index) => ({
            ...preference,
            sequence_order: index,
          })),
        };
      }),
    })),
  }));
}

export function applySequenceOrderResponseToCache(
  queryClient: QueryClient,
  preferenceClientId: string,
  sequenceOrder: number,
): void {
  updateMetafieldPreferencesCaches(queryClient, (data) => ({
    ...data,
    shops: data.shops.map((shop) => ({
      ...shop,
      item_categories: shop.item_categories.map((category) => ({
        ...category,
        metafield_preferences: category.metafield_preferences.map((preference) =>
          preference.client_id === preferenceClientId
            ? { ...preference, sequence_order: sequenceOrder }
            : preference,
        ),
      })),
    })),
  }));
}
