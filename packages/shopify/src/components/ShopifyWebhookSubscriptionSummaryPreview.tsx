import { ContentCard, SectionLabel } from "@beyo/ui";
import { ChevronRight } from "lucide-react";

import type { ShopifyWebhookSubscriptionSummary } from "../types";

export type ShopifyWebhookSubscriptionSummaryPreviewProps = {
  summary: ShopifyWebhookSubscriptionSummary;
  onOpenSubscriptions?: () => void;
};

function SummaryCount({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-between-border px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ShopifyWebhookSubscriptionSummaryPreview({
  summary,
  onOpenSubscriptions,
}: ShopifyWebhookSubscriptionSummaryPreviewProps): React.JSX.Element {
  return (
    <button
      className="w-full text-left disabled:opacity-60"
      data-testid="shopify-webhook-subscriptions-trigger"
      disabled={!onOpenSubscriptions}
      type="button"
      onClick={onOpenSubscriptions}
    >
      <ContentCard data-testid="shopify-webhook-summary-preview">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel as="h3" tone="muted">
            Webhook subscriptions
          </SectionLabel>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryCount label="Total" value={summary.total} />
          <SummaryCount label="Active" value={summary.active} />
          <SummaryCount label="Failed" value={summary.failed} />
          <SummaryCount label="Pending" value={summary.pending} />
          <SummaryCount label="Disabled" value={summary.disabled} />
          <SummaryCount label="Removed" value={summary.removed} />
        </div>
      </ContentCard>
    </button>
  );
}
