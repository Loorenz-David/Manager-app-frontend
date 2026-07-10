import { ShopifyIntegrationEventRecordCard } from "./ShopifyIntegrationEventRecordCard";
import { ShopifyWebhookIntakeRecordCard } from "./ShopifyWebhookIntakeRecordCard";
import type { ShopifyWebhookHistoryRecord } from "../types";

export type ShopifyWebhookHistoryRecordCardProps = {
  record: ShopifyWebhookHistoryRecord;
};

function assertUnreachableRecord(record: never): never {
  throw new Error(`Unsupported Shopify webhook history record: ${record}`);
}

export function ShopifyWebhookHistoryRecordCard({
  record,
}: ShopifyWebhookHistoryRecordCardProps): React.JSX.Element {
  switch (record.record_type) {
    case "webhook_intake":
      return <ShopifyWebhookIntakeRecordCard record={record} />;
    case "integration_event":
      return <ShopifyIntegrationEventRecordCard record={record} />;
    default:
      return assertUnreachableRecord(record);
  }
}
