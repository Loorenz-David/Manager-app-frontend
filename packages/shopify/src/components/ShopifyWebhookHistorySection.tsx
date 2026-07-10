import { ContentCard, SectionLabel } from "@beyo/ui";

import { useShopifyWebhookHistoryInfiniteQuery } from "../api/use-shopify-webhook-history-infinite-query";
import { ShopifyWebhookHistoryRecordCard } from "./ShopifyWebhookHistoryRecordCard";

export type ShopifyWebhookHistorySectionProps = {
  selectedShopIntegrationId: string | null;
};

function ShopifyWebhookHistoryLoadingState(): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="shopify-webhook-history-loading"
    >
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function ShopifyWebhookHistorySection({
  selectedShopIntegrationId,
}: ShopifyWebhookHistorySectionProps): React.JSX.Element | null {
  const query = useShopifyWebhookHistoryInfiniteQuery({
    shopIntegrationId: selectedShopIntegrationId,
  });

  if (!selectedShopIntegrationId) {
    return null;
  }

  const records =
    query.data?.pages.flatMap((page) => page.webhook_history_records) ?? [];

  return (
    <ContentCard data-testid="shopify-webhook-history-section">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel as="h3" tone="muted">
          Webhook activity
        </SectionLabel>
        {records.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {records.length} record{records.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {query.isPending ? <ShopifyWebhookHistoryLoadingState /> : null}

      {!query.isPending && query.isError ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Webhook activity could not be loaded.
          </p>
          <button
            className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
            type="button"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!query.isPending && !query.isError && records.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No webhook activity yet.
        </p>
      ) : null}

      {!query.isPending && !query.isError && records.length > 0 ? (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <ShopifyWebhookHistoryRecordCard
              key={record.client_id}
              record={record}
            />
          ))}

          {query.hasNextPage ? (
            <button
              className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium"
              disabled={query.isFetchingNextPage}
              type="button"
              onClick={() => {
                void query.fetchNextPage();
              }}
            >
              {query.isFetchingNextPage ? "Loading more..." : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </ContentCard>
  );
}
