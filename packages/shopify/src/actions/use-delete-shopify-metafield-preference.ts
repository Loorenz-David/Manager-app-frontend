import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteShopifyMetafieldPreferences } from "../api/delete-shopify-metafield-preferences";
import { shopifyKeys } from "../api/shopify-keys";
import { notify } from "@beyo/lib";
import {
  removeMetafieldPreferenceFromCache,
  restoreMetafieldPreferencesCache,
  snapshotMetafieldPreferencesCache,
  type MetafieldPreferencesCacheSnapshot,
} from "./shopify-metafield-preference-cache";

export function useDeleteShopifyMetafieldPreference() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteShopifyMetafieldPreferences,
    onMutate: async (preferenceClientId): Promise<MetafieldPreferencesCacheSnapshot> => {
      await queryClient.cancelQueries({
        queryKey: shopifyKeys.metafieldPreferencesCategories(),
      });
      const previous = snapshotMetafieldPreferencesCache(queryClient);
      removeMetafieldPreferenceFromCache(queryClient, preferenceClientId);
      return previous;
    },
    onError: (_error, _preferenceClientId, previous) => {
      if (previous) restoreMetafieldPreferencesCache(queryClient, previous);
      notify.error("Could not remove metafield preference");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.metafieldPreferences(),
      });
    },
  });

  return {
    deletePreference: mutation.mutate,
    deletePreferenceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
  };
}
