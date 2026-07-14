import type { ShopifyMetafieldPickerController } from "../../controllers/use-shopify-metafield-picker.controller";
import { ShopifyMetafieldSortableFields } from "./ShopifyMetafieldSortableFields";

export function ShopifyMetafieldFields({
  controller,
}: {
  controller: ShopifyMetafieldPickerController;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" data-testid="shopify-metafield-fields">
      {controller.unavailableDefinitions.map((unavailable) => (
        <div
          key={`${unavailable.shopIntegrationId}:${unavailable.definitionId}`}
          className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
          data-testid="shopify-metafield-unavailable"
        >
          {controller.shouldDisplayShopIdentity
            ? `${unavailable.shopDisplayName}: `
            : ""}
          A saved metafield is no longer available in Shopify.
        </div>
      ))}
      <ShopifyMetafieldSortableFields controller={controller} />
      {!controller.isEditMode && controller.hasMoreSearchResults ? (
        <button
          type="button"
          className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={controller.isLoadingMoreSearchResults}
          onClick={controller.loadMoreSearchResults}
          data-testid="shopify-metafield-search-load-more"
        >
          {controller.isLoadingMoreSearchResults ? "Loading more..." : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
