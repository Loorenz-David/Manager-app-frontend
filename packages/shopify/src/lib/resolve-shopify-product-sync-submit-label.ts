import type { ShopifyProductSyncFormMode } from "../types";

/**
 * Label of the form's final button.
 *
 * - keep (from the step's actions): "Save" writes to Shopify now; an untouched
 *   existing product just closes.
 * - submit (completing the step): an existing product is "Update"d only when
 *   changed, otherwise "Skip"; a new product is "Sync"ed when filled in.
 */
export function resolveShopifyProductSyncSubmitLabel({
  mode,
  hasExistingProduct,
  isDirty,
  isFilled,
}: {
  mode: ShopifyProductSyncFormMode;
  hasExistingProduct: boolean;
  isDirty: boolean;
  isFilled: boolean;
}): string {
  if (mode === "keep") {
    return hasExistingProduct && !isDirty ? "Close" : "Save";
  }
  if (hasExistingProduct) return isDirty ? "Update" : "Skip";
  return isFilled ? "Sync" : "Skip";
}
