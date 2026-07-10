import {
  shopifyIntegrationStatusLabel,
  shopifyIntegrationStatusVariant,
} from "../lib/shopify-status";
import type { ShopifyShopIntegration } from "../types";
import { StatePill, UserPill } from "@beyo/ui";
import { EllipsisVertical } from "lucide-react";

export type ShopifyIntegrationDetailHeaderProps = {
  shop: ShopifyShopIntegration;
  onOpenActions?: () => void;
};

export function ShopifyIntegrationDetailHeader({
  shop,
  onOpenActions,
}: ShopifyIntegrationDetailHeaderProps): React.JSX.Element {
  const title = shop.shop_name ?? shop.shop_domain;
  const subtitle = shop.shop_name ? shop.shop_domain : null;

  return (
    <div className=" pl-4 pt-4 pb-3 ">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {shop.created_by ? (
                  <UserPill
                    userName={shop.created_by.username}
                    imageAlt={shop.created_by.username}
                    imageSrc={shop.created_by.profile_picture}
                    className="bg-[var(--color-soft-container)] px-2.5 py-1 text-xs font-medium text-foreground shadow-xs "
                    data-testid="shopify-detail-created-by-pill"
                  />
                ) : (
                  <span data-testid="shopify-detail-created-by-fallback">
                    Unknown user
                  </span>
                )}
                <StatePill
                  label={shopifyIntegrationStatusLabel(shop.status)}
                  variant={shopifyIntegrationStatusVariant(shop.status)}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          aria-label="Shopify detail actions"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground disabled:opacity-50"
          disabled={!onOpenActions}
          type="button"
          onClick={onOpenActions}
        >
          <EllipsisVertical aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
