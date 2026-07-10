import { describe, expect, it } from "vitest";

import { selectBestShopifyCustomerLookupResult } from "./select-shopify-customer-lookup-result";

describe("selectBestShopifyCustomerLookupResult", () => {
  it("returns null for an empty result list", () => {
    expect(
      selectBestShopifyCustomerLookupResult([], {
        article_number: "BAR-1234567",
        sku: "SKU-123456",
      }),
    ).toBeNull();
  });

  it("prefers an exact sku match over a barcode match when both exist", () => {
    const result = selectBestShopifyCustomerLookupResult(
      [
        {
          match_type: "barcode",
          matched_value: "BAR-1234567",
          display_name: "Barcode Customer",
        },
        {
          match_type: "sku",
          matched_value: "SKU-123456",
          display_name: "Sku Customer",
        },
      ],
      {
        article_number: "BAR-1234567",
        sku: "SKU-123456",
      },
    );

    expect(result?.display_name).toBe("Sku Customer");
  });

  it("keeps the first result when scores are equal", () => {
    const result = selectBestShopifyCustomerLookupResult(
      [
        {
          match_type: "barcode",
          matched_value: "BAR-1234567",
          display_name: "First Customer",
        },
        {
          match_type: "barcode",
          matched_value: "BAR-1234567",
          display_name: "Second Customer",
        },
      ],
      {
        article_number: "BAR-1234567",
      },
    );

    expect(result?.display_name).toBe("First Customer");
  });
});
