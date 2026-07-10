import { useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker } from "@beyo/ui";
import { useListShopifyShopsQuery } from "../api/use-list-shopify-shops-query";
import type { ShopifyShopPickerSheetSurfaceProps } from "../surface-ids";
export function ShopifyShopPickerSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyShopPickerSheetSurfaceProps>();
  const [selected, setSelected] = useState(
    props.selectedShopIntegrationIds ?? [],
  );
  const shopsQuery = useListShopifyShopsQuery();
  const shops = shopsQuery.data?.shops ?? [];
  const options = shops.map((shop) => ({
    value: shop.client_id,
    label: shop.shop_name ?? shop.shop_domain ?? "Unnamed Shopify shop",
    description: shop.shop_name ? (shop.shop_domain ?? undefined) : undefined,
    testId: `shopify-shop-picker-option-${shop.client_id}`,
  }));

  return (
    <div className="flex flex-col gap-10 p-4">
      <div className="flex flex-col gap-3">
        {shopsQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load Shopify shops.
          </p>
        ) : shopsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">
            Loading Shopify shops...
          </p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active Shopify shops available.
          </p>
        ) : (
          <BoxPicker
            mode="multiple"
            value={selected}
            onValueChange={setSelected}
            options={options}
            layout="stack"
            visualVariant="horizontalDescription"
            showIcon={false}
            showDescription
            data-testid="shopify-shop-picker-options"
          />
        )}
      </div>
      <button
        type="button"
        className="rounded-xl bg-primary px-4 py-3 text-white"
        disabled={shopsQuery.isPending}
        onClick={() => {
          props.onConfirm?.(selected);
          header?.requestClose();
        }}
      >
        Save selection
      </button>
    </div>
  );
}
