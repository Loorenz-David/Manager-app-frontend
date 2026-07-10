import type { ShopifyIntegrationEventType } from "../types";

const SYSTEM_SOURCE_LABELS: Record<ShopifyIntegrationEventType, string> = {
  webhook_received: "Shopify webhook",
  webhook_processed: "Background worker",
  webhook_sync: "System",
  disconnect: "System",
};

const METADATA_PREVIEW_LIMIT = 4;

export function resolveShopifyIntegrationEventSourceLabel(
  eventType: ShopifyIntegrationEventType,
): string {
  return SYSTEM_SOURCE_LABELS[eventType];
}

export function getShopifyMetadataPreviewEntries(
  metadata: Record<string, unknown> | null,
): Array<[string, string]> {
  if (!metadata) {
    return [];
  }

  const entries: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (entries.length >= METADATA_PREVIEW_LIMIT) {
      break;
    }

    if (key === "raw_payload") {
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      entries.push([key, String(value)]);
      continue;
    }

    if (typeof value === "boolean") {
      entries.push([key, value ? "Yes" : "No"]);
    }
  }

  return entries;
}
