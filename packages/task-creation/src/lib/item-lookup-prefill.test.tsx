// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ItemPricingFieldsSchema } from "@beyo/item-economics";
import {
  ItemDetailsFieldsSchema,
  ItemLookupResultSchema,
  type ItemLookupResult,
} from "@beyo/items";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  applyLookupPropertiesResult,
  applyPurchasePriceLookupResult,
  createLookupResultSignature,
} from "./item-lookup-prefill";

type PricingFormValues = {
  item_pricing: {
    purchase_cost_per_piece: number | null;
  };
};

const PricingFormSchema = z.object({
  item_pricing: ItemPricingFieldsSchema.pick({ purchase_cost_per_piece: true }),
});

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
    const pricedItem = buildLookupResult({ purchase_price_minor: 125050 });
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

  it.each([
    ["a zero price", 0, 0],
    ["a negative price", -1, null],
    ["NaN", Number.NaN, null],
    ["positive infinity", Number.POSITIVE_INFINITY, null],
    ["negative infinity", Number.NEGATIVE_INFINITY, null],
  ])(
    "sanitizes %s without blocking validation",
    async (_case, purchasePrice, expectedValue) => {
      const { result } = renderHook(() =>
        useForm<PricingFormValues>({
          resolver: zodResolver(PricingFormSchema),
          defaultValues: {
            item_pricing: { purchase_cost_per_piece: 1250.5 },
          },
        }),
      );

      act(() => {
        applyPurchasePriceLookupResult(result.current, {
          purchase_price_minor: purchasePrice,
        });
      });

      expect(
        result.current.getValues("item_pricing.purchase_cost_per_piece"),
      ).toBe(expectedValue);

      let isValid = false;
      await act(async () => {
        isValid = await result.current.trigger();
      });
      expect(isValid).toBe(true);
    },
  );

  it("includes the properties snapshot in the lookup signature", () => {
    // Two results identical but for their snapshot must not be treated as the
    // same already-applied lookup, or the second one is silently skipped.
    expect(
      createLookupResultSignature(
        buildLookupResult({ properties: { material: "oak" } }),
      ),
    ).not.toBe(
      createLookupResultSignature(
        buildLookupResult({ properties: { material: "walnut" } }),
      ),
    );
  });

  it("includes the purchase price in the lookup signature", () => {
    expect(
      createLookupResultSignature(
        buildLookupResult({ purchase_price_minor: 100 }),
      ),
    ).not.toBe(
      createLookupResultSignature(
        buildLookupResult({ purchase_price_minor: 200 }),
      ),
    );
  });
});

describe("properties snapshot lookup prefill", () => {
  it("keeps the lookup snapshot intact rather than reshaping it", () => {
    const properties = {
      material: "oak",
      dimensions: { height_cm: 80 },
      tags: ["vintage", "restored"],
    };
    const setValue = vi.fn();

    applyLookupPropertiesResult(
      { setValue },
      buildLookupResult({ properties }),
    );

    // Verbatim: the backend derives properties_signature from this exact blob.
    expect(setValue).toHaveBeenCalledWith("item.properties", properties, {
      shouldDirty: true,
    });
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", {}],
  ])("writes undefined when the snapshot is %s", (_label, properties) => {
    const setValue = vi.fn();

    applyLookupPropertiesResult(
      { setValue },
      buildLookupResult({ properties }),
    );

    expect(setValue).toHaveBeenCalledWith("item.properties", undefined, {
      shouldDirty: true,
    });
  });
});

describe("properties snapshot survives the resolver", () => {
  // The real gate: `item.properties` is never registered as an input, and
  // zodResolver hands `handleSubmit` its *parsed* output. A value written by
  // setValue but missing from the schema is stripped before the payload is
  // ever built, so the snapshot has to round-trip through validation intact.
  it("reaches handleSubmit even though no input registers it", async () => {
    const properties = { material: "oak", dimensions: { height_cm: 80 } };
    const { result } = renderHook(() =>
      useForm({
        resolver: zodResolver(z.object({ item: ItemDetailsFieldsSchema })),
        defaultValues: { item: { article_number: "ABC-123" } },
      }),
    );

    act(() => {
      result.current.setValue("item.properties", properties, {
        shouldDirty: true,
      });
    });

    let submitted: unknown;
    await act(async () => {
      await result.current.handleSubmit((values) => {
        submitted = values;
      })();
    });

    expect(submitted).toMatchObject({ item: { properties } });
  });
});
