import { useEffect } from "react";
import { useController, useFormContext } from "react-hook-form";

import { useListShopifyShopsQuery } from "../../api/use-list-shopify-shops-query";
import {
  readLastSelectedShopIntegrationIds,
  writeLastSelectedShopIntegrationIds,
} from "../../lib/shopify-product-sync-storage";
import { useShopifyProductSyncFormContext } from "../../providers/ShopifyProductSyncFormProvider";
import type { ShopifyProductSyncFormValues } from "../../types";

export function ShopifyProductSyncShopField(): React.JSX.Element {
  const { control } = useFormContext<ShopifyProductSyncFormValues>();
  const { field, fieldState } = useController({
    name: "shopIntegrationIds",
    control,
  });
  const ctx = useShopifyProductSyncFormContext();
  const query = useListShopifyShopsQuery();

  useEffect(() => {
    if (field.value.length || !query.data) return;

    const validShopIntegrationIds = new Set(
      query.data.shops.map((shop) => shop.client_id),
    );
    const rememberedShopIntegrationIds =
      readLastSelectedShopIntegrationIds()?.filter((id) =>
        validShopIntegrationIds.has(id),
      ) ?? [];

    if (rememberedShopIntegrationIds.length) {
      field.onChange(rememberedShopIntegrationIds);
      return;
    }

    if (query.data.shops.length === 1) {
      field.onChange([query.data.shops[0].client_id]);
    }
  }, [field, query.data]);

  const selectedCount = field.value.length;
  const selectedLabel =
    selectedCount === 0
      ? "Select shops"
      : selectedCount === 1
        ? "1 shop selected"
        : `${selectedCount} shops selected`;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={!ctx.surfaceOpeners.openShopPicker}
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-muted-foreground  disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="shopify-product-sync-shop-field-trigger"
        onClick={() =>
          ctx.surfaceOpeners.openShopPicker?.({
            selectedShopIntegrationIds: field.value,
            onConfirm: (ids) => {
              field.onChange(ids);
              writeLastSelectedShopIntegrationIds(ids);
            },
          })
        }
      >
        <span>{selectedLabel}</span>
      </button>
      {fieldState.error ? (
        <span className="text-sm text-destructive">
          {fieldState.error.message}
        </span>
      ) : null}
    </div>
  );
}
