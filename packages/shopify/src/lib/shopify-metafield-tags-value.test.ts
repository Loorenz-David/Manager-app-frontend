import { describe, expect, it } from "vitest";

import {
  parseShopifyMetafieldTagsValue,
  stringifyShopifyMetafieldTagsValue,
} from "./shopify-metafield-tags-value";

describe("shopify metafield tags values", () => {
  it("parses a JSON string array", () => {
    expect(parseShopifyMetafieldTagsValue('["red","blue"]')).toEqual([
      "red",
      "blue",
    ]);
  });

  it("returns an empty array for invalid or non-string-array JSON", () => {
    expect(parseShopifyMetafieldTagsValue("not-json")).toEqual([]);
    expect(parseShopifyMetafieldTagsValue("[1, true]")).toEqual([]);
    expect(parseShopifyMetafieldTagsValue('{"value":"red"}')).toEqual([]);
  });

  it("round-trips tags through the Shopify string value", () => {
    const value = stringifyShopifyMetafieldTagsValue(["red", "blue"]);
    expect(value).toBe('["red","blue"]');
    expect(parseShopifyMetafieldTagsValue(value)).toEqual(["red", "blue"]);
  });
});
