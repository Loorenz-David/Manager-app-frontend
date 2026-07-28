import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { useSurface } from "@beyo/hooks";
import {
  SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID,
  ShopifyProductSyncFormProvider,
  ShopifyProductSyncInventoryField,
  ShopifyProductSyncShopField,
  type ShopifyShopPickerSheetSurfaceProps,
} from "@beyo/shopify";
import { FieldErrorPill, FieldLabelRow } from "@beyo/ui";

import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";
import type { PreOrderFormValues } from "../types";

/**
 * Shop + inventory-location selection for the `shopify_preorder` section. The
 * shop field is self-sustaining (loads its own shops, remembers the last
 * selection); a pre-order targets exactly one shop, so extra remembered
 * selections are clamped down to the first.
 */
export function PreOrderShopifySection(): React.JSX.Element {
  const surface = useSurface();
  const { taskClientId, itemClientId } = useTaskCreationFormContext();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<PreOrderFormValues>();
  const shopIntegrationIds =
    useWatch({ control, name: "shopIntegrationIds" }) ?? [];
  const selectedShopIntegrationId = shopIntegrationIds[0];

  useEffect(() => {
    if (shopIntegrationIds.length > 1) {
      setValue("shopIntegrationIds", [shopIntegrationIds[0]]);
    }
  }, [shopIntegrationIds, setValue]);

  const inventoryError = errors.inventoryAdjustments?.message;

  return (
    <ShopifyProductSyncFormProvider
      itemClientId={itemClientId}
      itemArticleNumber={null}
      itemSku={null}
      itemCategoryId={null}
      productCategory={null}
      defaultTitle={null}
      taskClientId={taskClientId}
      mode="submit"
      surfaceOpeners={{
        openShopPicker: (props: ShopifyShopPickerSheetSurfaceProps) =>
          surface.open(SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID, props),
      }}
    >
      <div
        className="flex flex-col gap-1.5"
        data-testid="pre-order-shopify-shop-section"
      >
        <FieldLabelRow label="Shopify shop" />
        <ShopifyProductSyncShopField />
      </div>
      {selectedShopIntegrationId ? (
        <ShopifyProductSyncInventoryField
          shopIntegrationId={selectedShopIntegrationId}
          shopIntegrationIds={shopIntegrationIds}
        />
      ) : null}
      {inventoryError ? (
        <FieldErrorPill
          data-testid="pre-order-shopify-inventory-error"
          message={inventoryError}
        />
      ) : null}
    </ShopifyProductSyncFormProvider>
  );
}
