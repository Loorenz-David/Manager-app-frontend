import { ContentCard, UserPill } from "@beyo/ui";

import {
  formatShopifyDetailDate,
  formatShopifyDetailValue,
} from "../lib/shopify-formatters";
import type { ShopifyShopIntegration } from "../types";

type DetailRowProps = {
  label: string;
  value: React.ReactNode;
};

function DetailRow({ label, value }: DetailRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export type ShopifyIntegrationTechnicalDetailsProps = {
  shop: ShopifyShopIntegration;
};

export function ShopifyIntegrationTechnicalDetails({
  shop,
}: ShopifyIntegrationTechnicalDetailsProps): React.JSX.Element {
  const updatedBy = shop.updated_by ? (
    <UserPill
      userName={shop.updated_by.username}
      imageAlt={shop.updated_by.username}
      imageSrc={shop.updated_by.profile_picture}
      className="bg-[var(--color-soft-container)] px-2.5 py-1 text-xs font-medium text-foreground"
      data-testid="shopify-detail-updated-by-pill"
    />
  ) : (
    <span data-testid="shopify-detail-updated-by-fallback">Unknown user</span>
  );

  return (
    <ContentCard
      data-testid="shopify-technical-details"
      gapClassName="gap-0"
      paddingClassName="px-4"
    >
      <div className="divide-y divide-border">
        <DetailRow
          label="API version"
          value={formatShopifyDetailValue(shop.api_version)}
        />
        <DetailRow
          label="Installed at"
          value={formatShopifyDetailDate(shop.installed_at)}
        />
        <DetailRow
          label="Uninstalled at"
          value={formatShopifyDetailDate(shop.uninstalled_at)}
        />
        <DetailRow
          label="Last connected at"
          value={formatShopifyDetailDate(shop.last_connected_at)}
        />
        <DetailRow
          label="Last health check at"
          value={formatShopifyDetailDate(shop.last_health_check_at)}
        />
        <DetailRow
          label="Last health check status"
          value={formatShopifyDetailValue(shop.last_health_check_status)}
        />
        <DetailRow
          label="Updated at"
          value={formatShopifyDetailDate(shop.updated_at)}
        />
        <DetailRow label="Updated by" value={updatedBy} />
      </div>
    </ContentCard>
  );
}
