import { ContentCard, FieldLabelRow, StatePill } from "@beyo/ui";

import {
  formatShopifyDetailDate,
  formatShopifyDetailValue,
} from "../lib/shopify-formatters";
import {
  shopifyWebhookIntakeStatusLabel,
  shopifyWebhookIntakeStatusVariant,
} from "../lib/shopify-status";
import type { ShopifyWebhookIntakeHistoryRecord } from "../types";

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

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

export type ShopifyWebhookIntakeRecordCardProps = {
  record: ShopifyWebhookIntakeHistoryRecord;
};

export function ShopifyWebhookIntakeRecordCard({
  record,
}: ShopifyWebhookIntakeRecordCardProps): React.JSX.Element {
  return (
    <ContentCard data-testid="shopify-webhook-intake-record-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">
            {record.topic}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Webhook ID {record.webhook_id}
          </p>
        </div>
        <StatePill
          label={shopifyWebhookIntakeStatusLabel(record.status)}
          variant={shopifyWebhookIntakeStatusVariant(record.status)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailField
          label="Retryable"
          value={formatBoolean(record.retryable)}
        />
        <DetailField label="Attempts" value={String(record.attempts)} />
        <DetailField
          label="Received at"
          value={formatShopifyDetailDate(record.received_at)}
        />
        <DetailField
          label="Processing started at"
          value={formatShopifyDetailDate(record.processing_started_at)}
        />
        <DetailField
          label="Processed at"
          value={formatShopifyDetailDate(record.processed_at)}
        />
        {record.last_error ? (
          <DetailField
            label="Last error"
            value={formatShopifyDetailValue(record.last_error)}
          />
        ) : null}
      </div>
    </ContentCard>
  );
}
