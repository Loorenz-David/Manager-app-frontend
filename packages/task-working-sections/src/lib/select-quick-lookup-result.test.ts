import { describe, expect, it } from "vitest";

import type { ItemLookupResult } from "@beyo/items";

import {
  createQuickLookupSignature,
  selectQuickLookupResult,
} from "./select-quick-lookup-result";

function buildLookupResult(
  overrides: Partial<ItemLookupResult> = {},
): ItemLookupResult {
  return {
    article_number: "1234567",
    sku: null,
    item_category_id: null,
    quantity: 2,
    external_id: null,
    external_source: null,
    images: [],
    ...overrides,
  };
}

describe("selectQuickLookupResult", () => {
  it("prefers the purchase API result", () => {
    const first = buildLookupResult({ article_number: "first" });
    const purchaseResult = buildLookupResult({
      article_number: "purchase",
      external_source: "purchase_api",
    });

    expect(selectQuickLookupResult([first, purchaseResult])).toBe(
      purchaseResult,
    );
  });

  it("returns null for an empty result", () => {
    expect(selectQuickLookupResult([])).toBeNull();
  });

  it("creates identical signatures for identical lookup data", () => {
    const first = buildLookupResult();
    const second = buildLookupResult();

    expect(createQuickLookupSignature(first)).toBe(
      createQuickLookupSignature(second),
    );
  });
});
