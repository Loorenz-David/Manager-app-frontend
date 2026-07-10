import { ContentCard, FieldLabelRow } from "@beyo/ui";
import { TriangleAlert } from "lucide-react";

import { formatShopifyDetailValue } from "../lib/shopify-formatters";

export type ShopifyIntegrationErrorPreviewProps = {
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export function ShopifyIntegrationErrorPreview({
  lastErrorCode,
  lastErrorMessage,
}: ShopifyIntegrationErrorPreviewProps): React.JSX.Element {
  const hasError = Boolean(lastErrorCode || lastErrorMessage);

  return (
    <ContentCard data-testid="shopify-error-preview">
      <div className="flex items-center gap-2"></div>

      {hasError ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start  gap-1">
              <FieldLabelRow label="Error code" />
              <TriangleAlert
                aria-hidden="true"
                className="size-4 shrink-0 text-[#8a5a00]"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {formatShopifyDetailValue(lastErrorCode)}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabelRow label="Error message" />
            <p className="text-sm text-foreground">
              {formatShopifyDetailValue(lastErrorMessage)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No current errors.</p>
      )}
    </ContentCard>
  );
}
