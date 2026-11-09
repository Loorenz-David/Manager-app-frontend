/** IndexedDB database where the product form used to keep drafts (removed). */
export const LEGACY_SHOPIFY_PRODUCT_SYNC_DRAFTS_DB = "beyo-shopify-drafts";

/**
 * Remove the old browser-stored product form drafts. The form now saves
 * straight to Shopify, so these are dead data. Safe to call on every start:
 * deleting a database that does not exist is a no-op.
 */
export function deleteLegacyShopifyProductSyncDrafts(): void {
  try {
    globalThis.indexedDB?.deleteDatabase(LEGACY_SHOPIFY_PRODUCT_SYNC_DRAFTS_DB);
  } catch {
    // Storage unavailable (private mode, blocked site data): nothing to clean.
  }
}
