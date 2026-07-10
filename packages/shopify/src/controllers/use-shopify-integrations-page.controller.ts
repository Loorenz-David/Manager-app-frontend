import { useState } from "react";

import { notify } from "@beyo/lib";

import { useCreateShopifyInstallUrl } from "../actions/use-create-shopify-install-url";
import { useListShopifyShopsQuery } from "../api/use-list-shopify-shops-query";
import { useShopifyIntegrationPermissions } from "../lib/use-shopify-integration-permissions";
import type { ShopifyIntegrationsSurfaceOpeners } from "../surface-ids";
import type { ShopifyShopIntegration } from "../types";

type UseShopifyIntegrationsPageControllerParams = {
  surfaceOpeners?: ShopifyIntegrationsSurfaceOpeners;
};

export type ShopifyIntegrationsPageController = {
  activeIndex: 0 | 1 | 2;
  selectedShopIntegrationId: string | null;
  shops: ShopifyShopIntegration[];
  isListLoading: boolean;
  listError: Error | null;
  permissions: ReturnType<typeof useShopifyIntegrationPermissions>;
  closeSurface?: () => void;
  openShop: (shop: ShopifyShopIntegration) => void;
  openCreate: () => void;
  goBackToList: () => void;
  refreshList: () => Promise<void>;
  submitShopDomain: (shopDomain: string) => Promise<void>;
  isSubmittingShopDomain: boolean;
};

export function useShopifyIntegrationsPageController({
  surfaceOpeners,
}: UseShopifyIntegrationsPageControllerParams): ShopifyIntegrationsPageController {
  const [activeIndex, setActiveIndex] = useState<0 | 1 | 2>(0);
  const [selectedShopIntegrationId, setSelectedShopIntegrationId] = useState<
    string | null
  >(null);

  const permissions = useShopifyIntegrationPermissions();
  const listQuery = useListShopifyShopsQuery({ limit: 50, offset: 0 });
  const createInstallUrl = useCreateShopifyInstallUrl();

  function openShop(shop: ShopifyShopIntegration): void {
    setSelectedShopIntegrationId(shop.client_id);
    setActiveIndex(1);
  }

  function openCreate(): void {
    setActiveIndex(2);
  }

  function goBackToList(): void {
    setActiveIndex(0);
    setSelectedShopIntegrationId(null);
  }

  async function refreshList(): Promise<void> {
    try {
      await listQuery.refetch();
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not refresh Shopify shops.",
      );
      throw error;
    }
  }

  async function submitShopDomain(shopDomain: string): Promise<void> {
    try {
      const result = await createInstallUrl.mutateAsync(shopDomain);
      window.location.assign(result.install_url);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not start the Shopify connection.",
        "Please try again.",
      );
      throw error;
    }
  }

  return {
    activeIndex,
    selectedShopIntegrationId,
    shops: listQuery.data?.shops ?? [],
    isListLoading: listQuery.isPending,
    listError: listQuery.error ?? null,
    permissions,
    closeSurface: surfaceOpeners?.closeSurface,
    openShop,
    openCreate,
    goBackToList,
    refreshList,
    submitShopDomain,
    isSubmittingShopDomain: createInstallUrl.isPending,
  };
}
