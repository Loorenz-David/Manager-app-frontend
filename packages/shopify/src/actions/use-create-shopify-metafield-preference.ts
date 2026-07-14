import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createShopifyMetafieldPreferences } from "../api/create-shopify-metafield-preferences";
import { shopifyKeys } from "../api/shopify-keys";
import { notify } from "@beyo/lib";
import type { ShopifyMetafieldPreference } from "../types";
import {
  addMetafieldPreferenceToCache,
  replaceMetafieldPreferenceInCache,
  restoreMetafieldPreferencesCache,
  snapshotMetafieldPreferencesCache,
  type MetafieldPreferencesCacheSnapshot,
} from "./shopify-metafield-preference-cache";

export type CreateShopifyMetafieldPreferenceInput = {
  itemCategoryId: string;
  preference: ShopifyMetafieldPreference;
};

export function useCreateShopifyMetafieldPreference() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ itemCategoryId, preference }: CreateShopifyMetafieldPreferenceInput) => {
      const [created] = await createShopifyMetafieldPreferences({
        item_category_id: itemCategoryId,
        preferences: [
          {
            client_id: preference.client_id,
            shop_integration_id: preference.shop_integration_id,
            shopify_metafield_definition_id:
              preference.shopify_metafield_definition_id,
            sequence_order: preference.sequence_order,
          },
        ],
      });
      return created;
    },
    onMutate: async ({ preference }): Promise<MetafieldPreferencesCacheSnapshot> => {
      await queryClient.cancelQueries({
        queryKey: shopifyKeys.metafieldPreferencesCategories(),
      });
      const previous = snapshotMetafieldPreferencesCache(queryClient);
      addMetafieldPreferenceToCache(queryClient, preference);
      return previous;
    },
    onSuccess: (created) => {
      if (created) replaceMetafieldPreferenceInCache(queryClient, created);
    },
    onError: (_error, _input, previous) => {
      if (previous) restoreMetafieldPreferencesCache(queryClient, previous);
      notify.error("Could not save metafield preference", "Your field value was preserved.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.metafieldPreferences(),
      });
    },
  });

  return {
    createPreference: mutation.mutate,
    createPreferenceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
  };
}
