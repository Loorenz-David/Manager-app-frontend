import { describe, expect, it } from "vitest";

import { buildShopifyPreorderSection } from "./normalize-task-form-payload";
import { buildPreOrderFormDefaultValues } from "./pre-order-form-default-values";
import {
  formatPreOrderPieces,
  formatPreOrderPrice,
  resolvePreOrderQuantity,
  resolvePreOrderTotalPrice,
} from "./pre-order-price";
import type { PreOrderFormValues } from "../types";

function buildValues(
  overrides: Partial<PreOrderFormValues> = {},
): PreOrderFormValues {
  const defaults = buildPreOrderFormDefaultValues("SKU-1");

  return {
    ...defaults,
    ...overrides,
    item: { ...defaults.item, ...overrides.item },
    shopIntegrationIds: overrides.shopIntegrationIds ?? ["shop-1"],
    inventoryAdjustments: overrides.inventoryAdjustments ?? [
      { shopIntegrationId: "shop-1", locationId: "loc-1", quantityToAdd: 3 },
    ],
  };
}

describe("resolvePreOrderQuantity", () => {
  it("falls back to one piece when the item carries no usable quantity", () => {
    expect(resolvePreOrderQuantity(undefined)).toBe(1);
    expect(resolvePreOrderQuantity(null)).toBe(1);
    expect(resolvePreOrderQuantity(0)).toBe(1);
    expect(resolvePreOrderQuantity(12)).toBe(12);
  });
});

describe("resolvePreOrderTotalPrice", () => {
  it("multiplies the piece price by the quantity", () => {
    expect(resolvePreOrderTotalPrice(100, 12)).toBe(1200);
  });

  it("prices a missing quantity as a single piece", () => {
    expect(resolvePreOrderTotalPrice(5200, undefined)).toBe(5200);
  });

  it("keeps the total on whole cents", () => {
    expect(resolvePreOrderTotalPrice(19.9, 3)).toBe(59.7);
  });

  it("has no total without a piece price", () => {
    expect(resolvePreOrderTotalPrice(null, 4)).toBeNull();
  });
});

describe("price and piece formatting", () => {
  it("groups kronor the Swedish way", () => {
    // Non-breaking group separator, so a total never wraps mid-number.
    expect(formatPreOrderPrice(1200)).toBe("1 200 kr");
    expect(formatPreOrderPrice(59.7)).toBe("59,7 kr");
  });

  it("keeps a single piece singular", () => {
    expect(formatPreOrderPieces(1)).toBe("1 pc");
    expect(formatPreOrderPieces(12)).toBe("12 pcs");
  });
});

describe("buildShopifyPreorderSection price", () => {
  it("sends the total, not the price of one piece", () => {
    const section = buildShopifyPreorderSection(
      buildValues({
        product_unit_price: 100,
        item: { sku: "SKU-1", quantity: 12 },
      }),
    );

    expect(
      (section?.product as Record<string, unknown> | undefined)?.price,
    ).toBe("1200.00");
  });

  it("sends the piece price itself for a single-piece pre-order", () => {
    const section = buildShopifyPreorderSection(
      buildValues({
        product_unit_price: 5200,
        item: { sku: "SKU-1", quantity: 1 },
      }),
    );

    expect(
      (section?.product as Record<string, unknown> | undefined)?.price,
    ).toBe("5200.00");
  });

  it("stays out of the payload until a price is entered", () => {
    expect(
      buildShopifyPreorderSection(buildValues({ product_unit_price: null })),
    ).toBeUndefined();
  });
});
