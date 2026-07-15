import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readLastSelectedInventoryLocationIds,
  SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY,
  writeLastSelectedInventoryLocationIds,
} from "./shopify-product-sync-inventory-storage";

describe("shopify product sync inventory storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no selection has been stored", () => {
    expect(readLastSelectedInventoryLocationIds("shop-1")).toBeNull();
  });

  it("returns null for malformed stored data", () => {
    window.localStorage.setItem(
      SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY,
      "not-json",
    );
    expect(readLastSelectedInventoryLocationIds("shop-1")).toBeNull();

    window.localStorage.setItem(
      SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY,
      JSON.stringify({
        "shop-1": { locationIds: "not-an-array", updatedAt: Date.now() },
      }),
    );
    expect(readLastSelectedInventoryLocationIds("shop-1")).toBeNull();
  });

  it("round-trips selections independently per shop", () => {
    writeLastSelectedInventoryLocationIds("shop-1", ["location-1"]);
    writeLastSelectedInventoryLocationIds("shop-2", ["location-2"]);

    expect(readLastSelectedInventoryLocationIds("shop-1")).toEqual([
      "location-1",
    ]);
    expect(readLastSelectedInventoryLocationIds("shop-2")).toEqual([
      "location-2",
    ]);
  });
});
