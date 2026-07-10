import { ConfirmActionButton, ContentCard } from "@beyo/ui";
import { Link2, RefreshCcw, ShieldAlert, Unplug } from "lucide-react";

import type { useShopifyIntegrationPermissions } from "../lib/use-shopify-integration-permissions";
import type { ShopifyShopIntegration } from "../types";

type ShopifyShopActionsSheetContentProps = {
  shop: ShopifyShopIntegration;
  permissions: ReturnType<typeof useShopifyIntegrationPermissions>;
  onReauthorize: () => Promise<void>;
  isReauthorizing: boolean;
  onSyncWebhooks: () => Promise<void>;
  isSyncingWebhooks: boolean;
  onDisconnect: () => Promise<void>;
  isDisconnecting: boolean;
};

function ActionButton({
  label,
  description,
  icon,
  disabled,
  onClick,
  testId,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  testId: string;
}): React.JSX.Element {
  return (
    <button
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left disabled:opacity-50"
      data-testid={testId}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft-container)] text-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function ShopifyShopActionsSheetContent({
  shop,
  permissions,
  onReauthorize,
  isReauthorizing,
  onSyncWebhooks,
  isSyncingWebhooks,
  onDisconnect,
  isDisconnecting,
}: ShopifyShopActionsSheetContentProps): React.JSX.Element {
  const canReauthorize =
    permissions.canCreateShopifyReauthorizeUrl &&
    shop.scopes_status === "outdated";
  const canSyncWebhooks =
    permissions.canSyncShopifyWebhooksForShop &&
    !["pending_install", "disabled", "uninstalled"].includes(shop.status);
  const canDisconnect =
    permissions.canDisconnectShopifyIntegration &&
    !["disabled", "uninstalled"].includes(shop.status);

  const hasAnyActions = canReauthorize || canSyncWebhooks || canDisconnect;

  return (
    <div
      className="flex flex-col gap-4 px-4 pb-6 pt-4"
      data-testid="shopify-shop-actions-sheet"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          {shop.shop_name ?? shop.shop_domain}
        </h2>
        <p className="text-sm text-muted-foreground">{shop.shop_domain}</p>
      </div>

      {hasAnyActions ? (
        <div className="flex flex-col gap-3">
          {canReauthorize ? (
            <ActionButton
              description="Refresh Shopify consent when the granted scopes are outdated."
              disabled={isReauthorizing}
              icon={<ShieldAlert aria-hidden="true" className="size-4" />}
              label="Reauthorize Shopify integration"
              testId="shopify-reauthorize-action"
              onClick={() => {
                void onReauthorize();
              }}
            />
          ) : null}

          {canSyncWebhooks ? (
            <ActionButton
              description={
                shop.webhooks_status === "synced"
                  ? "Re-run webhook registration for this shop."
                  : "Re-run webhook registration to repair webhook health."
              }
              disabled={isSyncingWebhooks}
              icon={<RefreshCcw aria-hidden="true" className="size-4" />}
              label="Sync webhooks"
              testId="shopify-sync-webhooks-action"
              onClick={() => {
                void onSyncWebhooks();
              }}
            />
          ) : null}

          {canDisconnect ? (
            <ConfirmActionButton
              align="left"
              backgroundColor="var(--color-card)"
              borderColor="var(--color-border)"
              className="w-full py-3.5 font-semibold text-foreground"
              confirmLabel="Tap again to disconnect"
              data-testid="shopify-disconnect-action"
              disabled={isDisconnecting}
              icon={<Unplug aria-hidden="true" className="size-4 shrink-0" />}
              label="Disconnect Shopify integration"
              onConfirm={() => {
                void onDisconnect();
              }}
            />
          ) : null}
        </div>
      ) : (
        <ContentCard>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft-container)] text-muted-foreground">
              <Link2 aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                No actions are available for this shop right now.
              </p>
              <p className="text-sm text-muted-foreground">
                This shop does not currently need any manual Shopify actions.
              </p>
            </div>
          </div>
        </ContentCard>
      )}
    </div>
  );
}
