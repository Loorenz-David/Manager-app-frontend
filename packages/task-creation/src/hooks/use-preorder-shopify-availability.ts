import { useEffect } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  useListShopifyLocationsQuery,
  useListShopifyShopsQuery,
} from "@beyo/shopify";

import type { PreOrderFormValues } from "../types";

export function usePreorderShopifyAvailability(
  form: UseFormReturn<PreOrderFormValues>,
): void {
  // Share the pickers' caches and keep availability current even off-step.
  const shopsQuery = useListShopifyShopsQuery();
  const shopIntegrationIds = useWatch({
    control: form.control,
    name: "shopIntegrationIds",
  }) ?? [];
  const selectedShopId = shopIntegrationIds[0];
  const locationsQuery = useListShopifyLocationsQuery(shopIntegrationIds);
  const shop = locationsQuery.data?.shops.find(
    (entry) => entry.shop_integration_id === selectedShopId,
  );
  const hasNoShops = shopsQuery.isSuccess && shopsQuery.data.shops.length === 0;
  const inventoryUnavailableFor =
    selectedShopId &&
    (locationsQuery.isError ||
      (locationsQuery.isSuccess &&
        (!shop || shop.status !== "ok" || shop.locations.length === 0)))
      ? selectedShopId
      : undefined;

  useEffect(() => {
    form.setValue("has_shopify_shops", !hasNoShops);
    if (hasNoShops) {
      form.setValue("shopIntegrationIds", []);
      form.setValue("inventoryQuantities", []);
      form.clearErrors(["shopIntegrationIds", "inventoryQuantities"]);
    }
  }, [form, hasNoShops]);

  useEffect(() => {
    form.setValue("shopify_inventory_unavailable_for", inventoryUnavailableFor);
    if (inventoryUnavailableFor) {
      // Stored inventory must not accidentally queue a Shopify request when
      // this shop cannot supply any locations in the current environment.
      form.setValue("inventoryQuantities", []);
      form.clearErrors("inventoryQuantities");
    }
  }, [form, inventoryUnavailableFor]);
}
