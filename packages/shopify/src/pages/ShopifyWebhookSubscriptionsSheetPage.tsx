import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ContentCard } from "@beyo/ui";

import { useGetShopifyShopQuery } from "../api/use-get-shopify-shop-query";
import { ShopifyWebhookSubscriptionsSheetContent } from "../components/ShopifyWebhookSubscriptionsSheetContent";
import type { ShopifyWebhookSubscriptionsSheetSurfaceProps } from "../surface-ids";

function ShopifyWebhookSubscriptionsMissingState(): React.JSX.Element {
  return (
    <div className="px-4 pb-6 pt-4">
      <ContentCard>
        <p className="text-sm text-muted-foreground">
          Webhook subscriptions could not be opened because the shop id is
          missing.
        </p>
      </ContentCard>
    </div>
  );
}

function ShopifyWebhookSubscriptionsLoadingState(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function ShopifyWebhookSubscriptionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyWebhookSubscriptionsSheetSurfaceProps>();
  const shopIntegrationId = props.shopIntegrationId ?? null;
  const query = useGetShopifyShopQuery(shopIntegrationId);

  useEffect(() => {
    header?.setTitle("Webhook subscriptions");
    header?.setActions(null);
  }, [header]);

  if (!shopIntegrationId) {
    return <ShopifyWebhookSubscriptionsMissingState />;
  }

  if (query.isPending) {
    return <ShopifyWebhookSubscriptionsLoadingState />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="px-4 pb-6 pt-4">
        <ContentCard>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Webhook subscriptions could not be loaded.
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
        </ContentCard>
      </div>
    );
  }

  return (
    <ShopifyWebhookSubscriptionsSheetContent
      subscriptions={query.data.webhook_subscriptions}
    />
  );
}
