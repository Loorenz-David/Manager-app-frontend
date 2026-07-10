import { formatShortDate } from "@beyo/lib";
import { ContentCard, StatePill } from "@beyo/ui";
import { ChevronRight, TriangleAlert } from "lucide-react";

import {
  hasShopifyHealthWarning,
  shopifyIntegrationStatusLabel,
  shopifyIntegrationStatusVariant,
} from "../lib/shopify-status";
import type { ShopifyShopIntegration } from "../types";

type ShopifyIntegrationCardProps = {
  shop: ShopifyShopIntegration;
  onPress: (shop: ShopifyShopIntegration) => void;
};

export function ShopifyIntegrationCard({
  shop,
  onPress,
}: ShopifyIntegrationCardProps): React.JSX.Element {
  const title = shop.shop_name ?? shop.shop_domain;
  const subtitle = shop.shop_name ? shop.shop_domain : null;
  const hasWarning = hasShopifyHealthWarning(
    shop.scopes_status,
    shop.webhooks_status,
  );

  return (
    <button
      className="mx-4 text-left"
      type="button"
      onClick={() => onPress(shop)}
    >
      <ContentCard paddingClassName="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {title}
              </p>
              {hasWarning ? (
                <TriangleAlert
                  aria-label="Shop health warning"
                  className="size-4 shrink-0 text-[#8a5a00]"
                />
              ) : null}
            </div>
            {subtitle ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Added {formatShortDate(shop.created_at) ?? shop.created_at}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatePill
              label={shopifyIntegrationStatusLabel(shop.status)}
              variant={shopifyIntegrationStatusVariant(shop.status)}
            />
            <ChevronRight aria-hidden="true" className="size-4 text-icon" />
          </div>
        </div>
      </ContentCard>
    </button>
  );
}
