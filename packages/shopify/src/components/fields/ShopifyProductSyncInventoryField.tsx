import { useEffect, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

import { BoxPicker, FieldLabelRow } from "@beyo/ui";

import { useListShopifyLocationsQuery } from "../../api/use-list-shopify-locations-query";
import {
  readLastSelectedInventoryLocationIds,
  writeLastSelectedInventoryLocationIds,
} from "../../lib/shopify-product-sync-inventory-storage";
import type {
  ShopifyProductSyncFormValues,
  ShopifyProductSyncInventoryQuantity,
} from "../../types";

type ShopifyProductSyncInventoryFieldProps = {
  shopIntegrationId: string;
  shopIntegrationIds: string[];
};

export function ShopifyProductSyncInventoryField({
  shopIntegrationId,
  shopIntegrationIds,
}: ShopifyProductSyncInventoryFieldProps): React.JSX.Element {
  const { control, getValues } = useFormContext<ShopifyProductSyncFormValues>();
  const { field } = useController({
    name: "inventoryQuantities",
    control,
  });
  const query = useListShopifyLocationsQuery(shopIntegrationIds);
  const shop = query.data?.shops.find(
    (entry) => entry.shop_integration_id === shopIntegrationId,
  );
  const quantities = field.value ?? [];
  const selectedLocationIds = quantities
    .filter((entry) => entry.shopIntegrationId === shopIntegrationId)
    .map((entry) => entry.locationId);
  const hasAppliedStoredSelectionRef = useRef(false);

  useEffect(() => {
    if (hasAppliedStoredSelectionRef.current) return;

    const currentQuantities = getValues("inventoryQuantities") ?? [];
    const hasExistingSelection = currentQuantities.some(
      (entry) => entry.shopIntegrationId === shopIntegrationId,
    );
    if (hasExistingSelection) {
      hasAppliedStoredSelectionRef.current = true;
      return;
    }

    if (query.isLoading || query.isError || shop?.status !== "ok") return;

    hasAppliedStoredSelectionRef.current = true;
    const availableLocationIds = new Set(
      shop.locations.map((location) => location.location_id),
    );
    const rememberedLocationIds = Array.from(
      new Set(
        (readLastSelectedInventoryLocationIds(shopIntegrationId) ?? []).filter(
          (locationId) => availableLocationIds.has(locationId),
        ),
      ),
    );

    if (!rememberedLocationIds.length) return;

    const nextQuantities = [
      ...currentQuantities,
      ...rememberedLocationIds.map(
        (locationId): ShopifyProductSyncInventoryQuantity => ({
          shopIntegrationId,
          locationId,
          quantity: 1,
        }),
      ),
    ];
    field.onChange(nextQuantities);
  }, [field, getValues, query.isError, query.isLoading, shop, shopIntegrationId]);

  function handleSelectionChange(nextLocationIds: string[]): void {
    const currentQuantities = getValues("inventoryQuantities") ?? [];
    const nextQuantities = [
      ...currentQuantities.filter(
        (entry) => entry.shopIntegrationId !== shopIntegrationId,
      ),
      ...nextLocationIds.map(
        (locationId): ShopifyProductSyncInventoryQuantity => ({
          shopIntegrationId,
          locationId,
          quantity: 1,
        }),
      ),
    ];

    field.onChange(nextQuantities);
    writeLastSelectedInventoryLocationIds(shopIntegrationId, nextLocationIds);
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid={`shopify-product-sync-inventory-field-${shopIntegrationId}`}
    >
      <div>
        <FieldLabelRow label="Inventory" />
        {shopIntegrationIds.length > 1 && shop ? (
          <p className="text-sm text-muted-foreground">{shop.shop_domain}</p>
        ) : null}
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading locations…</p>
      ) : null}
      {query.isError ? (
        <p className="text-sm text-destructive">
          Could not load Shopify locations.
        </p>
      ) : null}
      {!query.isLoading && !query.isError && shop?.status === "needs_reauth" ? (
        <p className="text-sm text-muted-foreground">
          Reauthorize this shop before adding inventory.
        </p>
      ) : null}
      {!query.isLoading && !query.isError && shop?.status === "error" ? (
        <p className="text-sm text-destructive">
          Locations could not be fetched for this shop.
        </p>
      ) : null}
      {!query.isLoading &&
      !query.isError &&
      shop?.status === "ok" &&
      shop.locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Shopify locations available.
        </p>
      ) : null}
      {!query.isLoading &&
      !query.isError &&
      shop?.status === "ok" &&
      shop.locations.length > 0 ? (
        <BoxPicker
          mode="multiple"
          value={selectedLocationIds}
          onValueChange={handleSelectionChange}
          layout="stack"
          visualVariant="horizontalDescription"
          options={shop.locations.map((location) => ({
            value: location.location_id,
            label: location.name,
            description: location.is_active
              ? undefined
              : "Inactive — will be activated before its absolute quantity is set.",
            testId: `shopify-inventory-location-${shopIntegrationId}-${location.location_id}`,
          }))}
          data-testid={`shopify-product-sync-inventory-picker-${shopIntegrationId}`}
        />
      ) : null}
    </div>
  );
}
