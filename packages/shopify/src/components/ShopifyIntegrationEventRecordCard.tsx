import { ContentCard, FieldLabelRow, StatePill, UserPill } from "@beyo/ui";

import { ShopifyWebhookMetadataPreview } from "./ShopifyWebhookMetadataPreview";
import { resolveShopifyIntegrationEventSourceLabel } from "../lib/shopify-history";
import { formatShopifyDetailDate } from "../lib/shopify-formatters";
import {
  shopifyIntegrationEventSeverityLabel,
  shopifyIntegrationEventSeverityVariant,
  shopifyIntegrationEventTypeLabel,
} from "../lib/shopify-status";
import type { ShopifyIntegrationEventHistoryRecord } from "../types";

type DetailFieldProps = {
  label: string;
  value: React.ReactNode;
};

function DetailField({ label, value }: DetailFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow label={label} />
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export type ShopifyIntegrationEventRecordCardProps = {
  record: ShopifyIntegrationEventHistoryRecord;
};

export function ShopifyIntegrationEventRecordCard({
  record,
}: ShopifyIntegrationEventRecordCardProps): React.JSX.Element {
  const createdBy = record.created_by ? (
    <UserPill
      userName={record.created_by.username}
      imageAlt={record.created_by.username}
      imageSrc={record.created_by.profile_picture}
      className="bg-[var(--color-soft-container)] px-2.5 py-1 text-xs font-medium text-foreground"
      data-testid="shopify-integration-event-created-by-pill"
    />
  ) : (
    <span data-testid="shopify-integration-event-created-by-fallback">
      {resolveShopifyIntegrationEventSourceLabel(record.event_type)}
    </span>
  );

  return (
    <ContentCard data-testid="shopify-integration-event-record-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            {shopifyIntegrationEventTypeLabel(record.event_type)}
          </h4>
          <p className="mt-1 text-sm text-foreground">{record.message}</p>
        </div>
        <StatePill
          label={shopifyIntegrationEventSeverityLabel(record.severity)}
          variant={shopifyIntegrationEventSeverityVariant(record.severity)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailField
          label="Created at"
          value={formatShopifyDetailDate(record.created_at)}
        />
        <DetailField label="Created by" value={createdBy} />
      </div>

      <ShopifyWebhookMetadataPreview metadata={record.metadata_json} />
    </ContentCard>
  );
}
