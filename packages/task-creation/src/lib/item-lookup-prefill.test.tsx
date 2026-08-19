// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { ItemLookupResultSchema, type ItemLookupResult } from "@beyo/items";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import {
  applyPurchasePriceLookupResult,
  createLookupResultSignature,
} from "./item-lookup-prefill";

type PricingFormValues = {
  item_pricing: {
    purchase_cost_per_piece: number | null;
  };
};

function buildLookupResult(
  overrides: Partial<ItemLookupResult> = {},
): ItemLookupResult {
  return ItemLookupResultSchema.parse({
    article_number: "ARTICLE-1",
    sku: null,
    item_category_id: null,
    quantity: 1,
    external_id: "purchase-1",
    external_source: "purchase_api",
    images: [],
    ...overrides,
  });
}

describe("purchase price lookup prefill", () => {
  it("populates a decimal lookup price and clears it when the next lookup omits the key", () => {
    const pricedItem = buildLookupResult({ purchase_price: 1250.5 });
    const unpricedItem = buildLookupResult({ article_number: "ARTICLE-2" });
    const { result } = renderHook(() =>
      useForm<PricingFormValues>({
        defaultValues: {
          item_pricing: { purchase_cost_per_piece: null },
        },
      }),
    );

    act(() => {
      applyPurchasePriceLookupResult(result.current, pricedItem);
    });
    expect(
      result.current.getValues("item_pricing.purchase_cost_per_piece"),
    ).toBe(1250.5);

    act(() => {
      applyPurchasePriceLookupResult(result.current, unpricedItem);
    });
    expect(
      result.current.getValues("item_pricing.purchase_cost_per_piece"),
    ).toBeNull();
  });

  it("includes the purchase price in the lookup signature", () => {
    expect(
      createLookupResultSignature(buildLookupResult({ purchase_price: 100 })),
    ).not.toBe(
      createLookupResultSignature(buildLookupResult({ purchase_price: 200 })),
    );
  });
});
