import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { ShopifyIntegrationsCarousel } from "../components/ShopifyIntegrationsCarousel";
import { useShopifyIntegrationsPageController } from "../controllers/use-shopify-integrations-page.controller";
import { ShopifyIntegrationCreateContainer } from "../containers/ShopifyIntegrationCreateContainer";
import { ShopifyIntegrationDetailContainer } from "../containers/ShopifyIntegrationDetailContainer";
import { ShopifyIntegrationsListContainer } from "../containers/ShopifyIntegrationsListContainer";
import type { ShopifyIntegrationsSlideSurfaceProps } from "../surface-ids";

export function ShopifyIntegrationsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyIntegrationsSlideSurfaceProps>();
  const controller = useShopifyIntegrationsPageController({
    surfaceOpeners: props.surfaceOpeners,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  function closeSurface(): void {
    if (controller.closeSurface) {
      controller.closeSurface();
      return;
    }

    header?.requestClose();
  }

  const selectedShopIntegrationId = controller.selectedShopIntegrationId;

  const onOpenActions =
    selectedShopIntegrationId && props.surfaceOpeners?.openShopActions
      ? () => {
          props.surfaceOpeners?.openShopActions?.({
            shopIntegrationId: selectedShopIntegrationId,
          });
        }
      : undefined;

  const onOpenSubscriptions =
    selectedShopIntegrationId &&
    props.surfaceOpeners?.openWebhookSubscriptions
      ? () => {
          props.surfaceOpeners?.openWebhookSubscriptions?.({
            shopIntegrationId: selectedShopIntegrationId,
          });
        }
      : undefined;

  return (
    <div
      className="h-full bg-background"
      data-testid="shopify-integrations-slide-page"
    >
      <ShopifyIntegrationsCarousel
        activeIndex={controller.activeIndex}
        createPane={
          <ShopifyIntegrationCreateContainer
            canCreate={controller.permissions.canCreateShopifyInstallUrl}
            isSubmitting={controller.isSubmittingShopDomain}
            onBack={controller.goBackToList}
            onSubmit={controller.submitShopDomain}
          />
        }
        detailPane={
          <ShopifyIntegrationDetailContainer
            onBack={controller.goBackToList}
            onOpenActions={onOpenActions}
            onOpenSubscriptions={onOpenSubscriptions}
            selectedShopIntegrationId={controller.selectedShopIntegrationId}
          />
        }
        listPane={
          <ShopifyIntegrationsListContainer
            canCreate={controller.permissions.canCreateShopifyInstallUrl}
            canView={controller.permissions.canViewShopifyIntegrations}
            error={controller.listError}
            isLoading={controller.isListLoading}
            shops={controller.shops}
            onClose={closeSurface}
            onOpenCreate={controller.openCreate}
            onOpenShop={controller.openShop}
            onRefresh={controller.refreshList}
          />
        }
      />
    </div>
  );
}
