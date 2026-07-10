import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ContentCard } from "@beyo/ui";

import { useCreateShopifyReauthorizeUrl } from "../actions/use-create-shopify-reauthorize-url";
import { useDisconnectShopifyShop } from "../actions/use-disconnect-shopify-shop";
import { useSyncShopifyWebhooksForShop } from "../actions/use-sync-shopify-webhooks-for-shop";
import { shopifyKeys } from "../api/shopify-keys";
import { useGetShopifyShopQuery } from "../api/use-get-shopify-shop-query";
import { ShopifyShopActionsSheetContent } from "../components/ShopifyShopActionsSheetContent";
import { useShopifyIntegrationPermissions } from "../lib/use-shopify-integration-permissions";
import type { ShopifyShopActionsSheetSurfaceProps } from "../surface-ids";

function ShopifyShopActionsMissingState(): React.JSX.Element {
  return (
    <div className="px-4 pb-6 pt-4">
      <ContentCard>
        <p className="text-sm text-muted-foreground">
          Shopify shop actions could not be opened because the shop id is
          missing.
        </p>
      </ContentCard>
    </div>
  );
}

function ShopifyShopActionsLoadingState(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
      <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function ShopifyShopActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyShopActionsSheetSurfaceProps>();
  const shopIntegrationId = props.shopIntegrationId ?? null;
  const queryClient = useQueryClient();
  const shopQuery = useGetShopifyShopQuery(shopIntegrationId);
  const reauthorize = useCreateShopifyReauthorizeUrl();
  const syncWebhooks = useSyncShopifyWebhooksForShop();
  const disconnect = useDisconnectShopifyShop();
  const permissions = useShopifyIntegrationPermissions();

  useEffect(() => {
    header?.setHeaderHidden(true);
    header?.setActions(null);
  }, [header]);

  if (!shopIntegrationId) {
    return <ShopifyShopActionsMissingState />;
  }

  if (shopQuery.isPending) {
    return <ShopifyShopActionsLoadingState />;
  }

  if (shopQuery.isError || !shopQuery.data) {
    return (
      <div className="px-4 pb-6 pt-4">
        <ContentCard>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Shopify shop actions could not be loaded.
            </p>
            <button
              className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
              type="button"
              onClick={() => {
                void shopQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </ContentCard>
      </div>
    );
  }

  const activeShopIntegrationId = shopIntegrationId;

  async function handleReauthorize(): Promise<void> {
    try {
      const result = await reauthorize.mutateAsync(activeShopIntegrationId);
      window.location.assign(result.install_url);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not start Shopify reauthorization.",
      );
    }
  }

  async function handleSyncWebhooks(): Promise<void> {
    try {
      await syncWebhooks.mutateAsync(activeShopIntegrationId);
      await queryClient.invalidateQueries({
        queryKey: shopifyKeys.shops(),
      });
      notify.success("Webhook sync started.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not start webhook sync.",
      );
    }
  }

  async function handleDisconnect(): Promise<void> {
    try {
      await disconnect.mutateAsync(activeShopIntegrationId);
      notify.success("Shopify integration disconnected.");
      header?.requestClose();
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not disconnect this Shopify integration.",
      );
    }
  }

  return (
    <ShopifyShopActionsSheetContent
      shop={shopQuery.data.shop_integration}
      permissions={permissions}
      isDisconnecting={disconnect.isPending}
      isReauthorizing={reauthorize.isPending}
      isSyncingWebhooks={syncWebhooks.isPending}
      onDisconnect={handleDisconnect}
      onReauthorize={handleReauthorize}
      onSyncWebhooks={handleSyncWebhooks}
    />
  );
}
