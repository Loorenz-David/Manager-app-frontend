import { describe, expect, it } from "vitest";

import { resolveShopifyProductSyncSubmitLabel as label } from "./resolve-shopify-product-sync-submit-label";

describe("resolveShopifyProductSyncSubmitLabel", () => {
  it("completion: an unchanged existing product skips, a changed one updates", () => {
    expect(label({ mode: "submit", hasExistingProduct: true, isDirty: false, isFilled: true })).toBe("Skip");
    expect(label({ mode: "submit", hasExistingProduct: true, isDirty: true, isFilled: true })).toBe("Update");
  });

  it("completion without a product syncs only a filled form", () => {
    expect(label({ mode: "submit", hasExistingProduct: false, isDirty: true, isFilled: true })).toBe("Sync");
    expect(label({ mode: "submit", hasExistingProduct: false, isDirty: false, isFilled: false })).toBe("Skip");
  });

  it("keep mode saves to Shopify, or just closes an untouched existing product", () => {
    expect(label({ mode: "keep", hasExistingProduct: false, isDirty: false, isFilled: false })).toBe("Save");
    expect(label({ mode: "keep", hasExistingProduct: true, isDirty: true, isFilled: true })).toBe("Save");
    expect(label({ mode: "keep", hasExistingProduct: true, isDirty: false, isFilled: true })).toBe("Close");
  });
});
