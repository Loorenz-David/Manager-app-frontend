import type { ShopifyProductSyncFormValues } from "../types";

export const SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS = [
  {
    name: "heightCm",
    label: "Height",
    metafieldKey: "totalheight",
    inputTestId: "shopify-product-sync-height-input",
  },
  {
    name: "widthCm",
    label: "Width",
    metafieldKey: "totalwidth",
    inputTestId: "shopify-product-sync-width-input",
  },
  {
    name: "depthCm",
    label: "Depth",
    metafieldKey: "totaldepth",
    inputTestId: "shopify-product-sync-depth-input",
  },
] as const satisfies ReadonlyArray<{
  name: "heightCm" | "widthCm" | "depthCm";
  label: string;
  metafieldKey: string;
  inputTestId: string;
}>;

export type ShopifyProductSyncDimensionName =
  (typeof SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS)[number]["name"];

export function hasPositiveShopifyProductSyncDimension(
  value: ShopifyProductSyncFormValues[ShopifyProductSyncDimensionName],
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
