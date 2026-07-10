import { ContentCard, StatePill } from "@beyo/ui";

import { formatShopifyDetailDate } from "../lib/shopify-formatters";
import {
  shopifyWebhookSubscriptionStatusLabel,
  shopifyWebhookSubscriptionStatusVariant,
} from "../lib/shopify-status";
import type { ShopifyWebhookSubscription } from "../types";

export type ShopifyWebhookSubscriptionsSheetContentProps = {
  subscriptions: ShopifyWebhookSubscription[];
};

export function ShopifyWebhookSubscriptionsSheetContent({
  subscriptions,
}: ShopifyWebhookSubscriptionsSheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-4 px-4 pb-6 pt-4"
      data-testid="shopify-webhook-subscriptions-sheet"
    >
      {subscriptions.length === 0 ? (
        <ContentCard>
          <p className="text-sm text-muted-foreground">
            No webhook subscriptions yet.
          </p>
        </ContentCard>
      ) : (
        <div className="flex flex-col gap-2">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.client_id}
              className="rounded-xl border border-border bg-card px-3 py-3"
              data-testid="shopify-webhook-subscription-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {subscription.topic}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Installed{" "}
                    {formatShopifyDetailDate(subscription.installed_at)}
                  </p>
                  {subscription.last_error_code ? (
                    <p className="mt-1 text-xs text-[#8a5a00]">
                      Error: {subscription.last_error_code}
                    </p>
                  ) : null}
                </div>
                <StatePill
                  label={shopifyWebhookSubscriptionStatusLabel(
                    subscription.status,
                  )}
                  variant={shopifyWebhookSubscriptionStatusVariant(
                    subscription.status,
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
