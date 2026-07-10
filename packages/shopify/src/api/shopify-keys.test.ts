import { describe, expect, it } from "vitest";

import { shopifyKeys } from "./shopify-keys";

describe("shopifyKeys", () => {
  it("builds stable keys for list, detail, and history queries", () => {
    expect(shopifyKeys.all).toEqual(["shopify"]);
    expect(shopifyKeys.shops()).toEqual(["shopify", "shops"]);
    expect(shopifyKeys.shopsList({ limit: 25, offset: 10 })).toEqual([
      "shopify",
      "shops",
      "list",
      { limit: 25, offset: 10 },
    ]);
    expect(shopifyKeys.shopDetail("shop_123")).toEqual([
      "shopify",
      "shops",
      "detail",
      "shop_123",
    ]);
    expect(shopifyKeys.webhookHistory("shop_123")).toEqual([
      "shopify",
      "shops",
      "shop_123",
      "webhook-history",
      {},
    ]);
    expect(shopifyKeys.webhookHistoryRoot("shop_123")).toEqual([
      "shopify",
      "shops",
      "shop_123",
      "webhook-history",
    ]);
    expect(shopifyKeys.webhookHistoryInfinite("shop_123")).toEqual([
      "shopify",
      "shops",
      "shop_123",
      "webhook-history",
      "infinite",
    ]);
  });

  it("keeps single-page and infinite webhook history caches distinct", () => {
    expect(shopifyKeys.webhookHistory("shop_123")).not.toEqual(
      shopifyKeys.webhookHistoryInfinite("shop_123"),
    );
  });
});
