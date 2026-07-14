import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateShopifyMetafieldPreferenceSequenceOrder } from "../api/update-shopify-metafield-preference-sequence-order";
import { shopifyKeys } from "../api/shopify-keys";
import { notify } from "@beyo/lib";
import {
  applySequenceOrderResponseToCache,
  reorderMetafieldPreferenceInCache,
  restoreMetafieldPreferencesCache,
  snapshotMetafieldPreferencesCache,
  type MetafieldPreferencesCacheSnapshot,
} from "./shopify-metafield-preference-cache";

export type ReorderShopifyMetafieldPreferenceInput = {
  preferenceClientId: string;
  sequenceOrder: number;
};

export function useReorderShopifyMetafieldPreference() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateShopifyMetafieldPreferenceSequenceOrder,
    onMutate: async ({ preferenceClientId, sequenceOrder }): Promise<MetafieldPreferencesCacheSnapshot> => {
      await queryClient.cancelQueries({
        queryKey: shopifyKeys.metafieldPreferencesCategories(),
      });
      const previous = snapshotMetafieldPreferencesCache(queryClient);
      reorderMetafieldPreferenceInCache(
        queryClient,
        preferenceClientId,
        sequenceOrder,
      );
      return previous;
    },
    onSuccess: (response) => {
      applySequenceOrderResponseToCache(
        queryClient,
        response.client_id,
        response.sequence_order,
      );
    },
    onError: (_error, _input, previous) => {
      if (previous) restoreMetafieldPreferencesCache(queryClient, previous);
      notify.error("Could not reorder metafield preferences");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.metafieldPreferences(),
      });
    },
  });

  return {
    reorderPreference: mutation.mutate,
    reorderPreferenceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
  };
}
