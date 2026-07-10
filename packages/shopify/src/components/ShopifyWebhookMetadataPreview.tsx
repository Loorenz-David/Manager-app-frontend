import { FieldLabelRow } from "@beyo/ui";

import { getShopifyMetadataPreviewEntries } from "../lib/shopify-history";

export type ShopifyWebhookMetadataPreviewProps = {
  metadata: Record<string, unknown> | null;
};

export function ShopifyWebhookMetadataPreview({
  metadata,
}: ShopifyWebhookMetadataPreviewProps): React.JSX.Element | null {
  const entries = getShopifyMetadataPreviewEntries(metadata);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl bg-muted/50 px-3 py-3"
      data-testid="shopify-webhook-metadata-preview"
    >
      <FieldLabelRow label="Metadata" />
      <div className="flex flex-col gap-2">
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3 text-sm"
            data-testid="shopify-webhook-metadata-row"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
