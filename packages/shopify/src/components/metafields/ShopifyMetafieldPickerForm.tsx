import type { ShopifyProductSyncMetafieldValue } from "../../types";
import { useShopifyMetafieldPickerController } from "../../controllers/use-shopify-metafield-picker.controller";
import { ShopifyMetafieldFields } from "./ShopifyMetafieldFields";
import { ShopifyMetafieldSearch } from "./ShopifyMetafieldSearch";

export function ShopifyMetafieldPickerForm({
  shopIntegrationIds,
  itemCategoryId,
  value,
  onChange,
}: {
  shopIntegrationIds: string[];
  itemCategoryId: string | null;
  value: ShopifyProductSyncMetafieldValue[];
  onChange: (value: ShopifyProductSyncMetafieldValue[]) => void;
}): React.JSX.Element {
  const controller = useShopifyMetafieldPickerController({
    shopIntegrationIds,
    itemCategoryId,
    value,
    onChange,
  });
  return (
    <section
      className="flex flex-col gap-4"
      data-testid="shopify-metafield-picker"
    >
      <ShopifyMetafieldSearch
        value={controller.searchQuery}
        onChange={controller.setSearchQuery}
        isLoading={controller.isSearchLoading}
        disabled={!controller.hasSelectedShops}
        isEditMode={controller.isEditMode}
        onToggleEditMode={controller.toggleEditMode}
        editDisabled={
          !controller.hasSelectedShops || !controller.hasItemCategory
        }
      />
      {!controller.hasSelectedShops ? (
        <p className="text-sm text-muted-foreground">
          Select a Shopify shop to choose metafields.
        </p>
      ) : !controller.hasItemCategory ? (
        <p className="text-sm text-muted-foreground">
          Search is available, but new choices cannot be remembered without an
          item category.
        </p>
      ) : null}
      {controller.isCategoryLoading ? (
        <div
          className="h-20 animate-pulse rounded-lg bg-muted"
          data-testid="shopify-metafield-category-loading"
        />
      ) : null}
      {controller.categoryError ? (
        <p className="text-sm text-destructive">
          Could not load saved metafields.
        </p>
      ) : null}
      {controller.searchError ? (
        <p className="text-sm text-destructive">Could not search metafields.</p>
      ) : null}
      <ShopifyMetafieldFields controller={controller} />
    </section>
  );
}
