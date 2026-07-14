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

  it("normalizes category and search metafield preference keys", () => {
    expect(
      shopifyKeys.metafieldPreferencesCategory({
        shopIntegrationIds: ["shop_b", "shop_a"],
        itemCategoryIds: ["cat_b", "cat_a"],
      }),
    ).toEqual([
      "shopify",
      "metafield-preferences",
      "category",
      {
        shopIntegrationIds: ["shop_a", "shop_b"],
        itemCategoryIds: ["cat_a", "cat_b"],
        onlyMyPreferences: false,
      },
    ]);
    expect(
      shopifyKeys.metafieldPreferencesSearch({
        shopIntegrationIds: ["shop_b", "shop_a"],
        q: "  Height  ",
      }),
    ).toEqual([
      "shopify",
      "metafield-preferences",
      "search",
      { shopIntegrationIds: ["shop_a", "shop_b"], q: "height" },
    ]);
  });
});
