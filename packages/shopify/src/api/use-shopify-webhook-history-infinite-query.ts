import { useInfiniteQuery } from "@tanstack/react-query";

import { getShopifyWebhookHistory } from "./get-shopify-webhook-history";
import { shopifyKeys } from "./shopify-keys";

type UseShopifyWebhookHistoryInfiniteQueryParams = {
  shopIntegrationId: string | null | undefined;
  pageSize?: number;
  loadMoreSize?: number;
};

export function useShopifyWebhookHistoryInfiniteQuery({
  shopIntegrationId,
  pageSize = 3,
  loadMoreSize = 5,
}: UseShopifyWebhookHistoryInfiniteQueryParams) {
  return useInfiniteQuery({
    queryKey: shopIntegrationId
      ? shopifyKeys.webhookHistoryInfinite(shopIntegrationId)
      : shopifyKeys.missing(),
    queryFn: ({ pageParam }) => {
      if (!shopIntegrationId) {
        throw new Error("Shopify shop integration id is required.");
      }

      return getShopifyWebhookHistory(shopIntegrationId, {
        limit: pageParam === 0 ? pageSize : loadMoreSize,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.webhook_history_records_pagination.has_more
        ? lastPage.webhook_history_records_pagination.offset +
          lastPage.webhook_history_records_pagination.limit
        : undefined,
    enabled: Boolean(shopIntegrationId),
  });
}
