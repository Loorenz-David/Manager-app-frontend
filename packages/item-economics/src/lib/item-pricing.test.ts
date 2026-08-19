import { describe, expect, it } from "vitest";

import {
  INLINE_PRICING_CURRENCY,
  formatMinorPrice,
  formatPieces,
  formatPrice,
  resolvePricingQuantity,
  resolveTotalMinor,
  toMajorUnitString,
  toMinorUnits,
} from "./item-pricing";

describe("resolvePricingQuantity", () => {
  it("treats a missing or non-positive quantity as one piece", () => {
    expect(resolvePricingQuantity(null)).toBe(1);
    expect(resolvePricingQuantity(undefined)).toBe(1);
    expect(resolvePricingQuantity(0)).toBe(1);
    expect(resolvePricingQuantity(-3)).toBe(1);
  });

  it("keeps a real quantity", () => {
    expect(resolvePricingQuantity(4)).toBe(4);
  });
});

describe("toMinorUnits", () => {
  it("converts kronor to öre", () => {
    expect(toMinorUnits(1200)).toBe(120_000);
    expect(toMinorUnits(19.99)).toBe(1999);
  });

  it("rounds to whole öre", () => {
    expect(toMinorUnits(19.994)).toBe(1999);
    expect(toMinorUnits(19.996)).toBe(2000);
  });
});

describe("resolveTotalMinor", () => {
  it("multiplies the per-piece minor amount by the quantity", () => {
    expect(resolveTotalMinor(1200, 4)).toBe(480_000);
  });

  it("treats a missing quantity as one piece", () => {
    expect(resolveTotalMinor(1200, null)).toBe(120_000);
  });

  it("returns null for an absent price rather than forging a zero", () => {
    // A zero purchase cost is a real value meaning free; it must never be
    // invented for a field the user left empty.
    expect(resolveTotalMinor(null, 4)).toBeNull();
    expect(resolveTotalMinor(undefined, 4)).toBeNull();
    expect(resolveTotalMinor(Number.NaN, 4)).toBeNull();
  });

  it("keeps an explicit zero", () => {
    expect(resolveTotalMinor(0, 4)).toBe(0);
  });

  it("rounds to minor units before multiplying, not after", () => {
    // 19.995 kr over 2 pieces:
    //   round(19.995 * 100) * 2 = 4000  ← 2 × the 20,00 kr the breakdown shows
    //   round(19.995 * 2 * 100) = 3999  ← one öre adrift of its own arithmetic
    expect(resolveTotalMinor(19.995, 2)).toBe(4000);

    // 12.345 kr over 4 pieces diverges by two öre the other way.
    expect(resolveTotalMinor(12.345, 4)).toBe(4940);
  });

  it("agrees with the figure the breakdown displays", () => {
    const perPiece = 19.995;
    const quantity = 2;
    const total = resolveTotalMinor(perPiece, quantity);

    expect(total).toBe(toMinorUnits(perPiece) * quantity);
  });
});

describe("toMajorUnitString", () => {
  it("renders the Shopify product price from the same total", () => {
    expect(toMajorUnitString(480_000)).toBe("4800.00");
    expect(toMajorUnitString(5997)).toBe("59.97");
    expect(toMajorUnitString(0)).toBe("0.00");
  });

  it("matches the item valuation it was derived from", () => {
    const total = resolveTotalMinor(1200, 4);
    expect(total).not.toBeNull();
    expect(Number(toMajorUnitString(total as number)) * 100).toBe(total);
  });
});

describe("formatting", () => {
  // sv-SE groups with a non-breaking space (U+00A0), deliberately kept: it stops
  // "1 200 kr" wrapping across two lines mid-number.
  it("groups kronor the Swedish way regardless of device locale", () => {
    expect(formatPrice(1200)).toBe("1\u00a0200 kr");
    expect(formatMinorPrice(480_000)).toBe("4\u00a0800 kr");
  });

  it("pluralises pieces", () => {
    expect(formatPieces(1)).toBe("1 pc");
    expect(formatPieces(4)).toBe("4 pcs");
  });
});

describe("INLINE_PRICING_CURRENCY", () => {
  it("is the value the backend expects", () => {
    expect(INLINE_PRICING_CURRENCY).toBe("swedish_krona");
  });
});
