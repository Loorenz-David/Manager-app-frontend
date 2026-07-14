import Dexie, { type Table } from "dexie";
import type { ShopifyProductSyncDraftRecord } from "./shopify-product-sync-draft-types";

class ShopifyDraftsDatabase extends Dexie {
  productSyncDrafts!: Table<ShopifyProductSyncDraftRecord, string>;

  constructor() {
    super("beyo-shopify-drafts");
    this.version(1).stores({
      productSyncDrafts: "taskClientId, expiresAt",
    });
  }
}

export const shopifyDraftsDb = new ShopifyDraftsDatabase();
