export const shopifyKeys = {
  all: ["shopify"] as const,
  shops: () => [...shopifyKeys.all, "shops"] as const,
  shopsList: (params: { limit?: number; offset?: number } = {}) =>
    [...shopifyKeys.shops(), "list", params] as const,
  scopeStatuses: (params: { shopIntegrationId?: string } = {}) =>
    [...shopifyKeys.shops(), "scope-statuses", params] as const,
  shopDetails: () => [...shopifyKeys.shops(), "detail"] as const,
  shopDetail: (id: string) => [...shopifyKeys.shopDetails(), id] as const,
  webhookHistoryRoot: (id: string) =>
    [...shopifyKeys.shops(), id, "webhook-history"] as const,
  webhookHistory: (id: string, params: { limit?: number; offset?: number } = {}) =>
    [...shopifyKeys.webhookHistoryRoot(id), params] as const,
  webhookHistoryInfinite: (id: string) =>
    [...shopifyKeys.webhookHistoryRoot(id), "infinite"] as const,
  metafieldPreferences: () =>
    [...shopifyKeys.all, "metafield-preferences"] as const,
  metafieldPreferencesCategories: () =>
    [...shopifyKeys.metafieldPreferences(), "category"] as const,
  metafieldPreferencesCategory: (params: {
    shopIntegrationIds: string[];
    itemCategoryIds: string[];
    onlyMyPreferences?: boolean;
  }) =>
    [
      ...shopifyKeys.metafieldPreferences(),
      "category",
      {
        shopIntegrationIds: [...params.shopIntegrationIds].sort(),
        itemCategoryIds: [...params.itemCategoryIds].sort(),
        onlyMyPreferences: params.onlyMyPreferences ?? false,
      },
    ] as const,
  metafieldPreferencesCategoryInfinite: (params: {
    shopIntegrationIds: string[];
    itemCategoryIds: string[];
    onlyMyPreferences?: boolean;
  }) =>
    [...shopifyKeys.metafieldPreferencesCategory(params), "infinite"] as const,
  metafieldPreferencesSearch: (params: {
    shopIntegrationIds: string[];
    q: string;
  }) =>
    [
      ...shopifyKeys.metafieldPreferences(),
      "search",
      {
        shopIntegrationIds: [...params.shopIntegrationIds].sort(),
        q: params.q.trim().toLowerCase(),
      },
    ] as const,
  metafieldPreferencesSearchInfinite: (params: {
    shopIntegrationIds: string[];
    q: string;
  }) =>
    [...shopifyKeys.metafieldPreferencesSearch(params), "infinite"] as const,
  missing: () => [...shopifyKeys.all, "missing"] as const,
};
