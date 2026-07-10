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
  missing: () => [...shopifyKeys.all, "missing"] as const,
};
