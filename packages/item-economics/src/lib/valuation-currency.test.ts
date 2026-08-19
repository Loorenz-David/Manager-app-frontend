import { describe, expect, it } from "vitest";

import { currencyDisplayCode, formatPerPiece } from "./valuation-currency";

/**
 * `sv-SE` groups with a non-breaking space (U+00A0), not an ASCII space. Every
 * expectation below spells the separator as the escape rather than pasting an
 * invisible byte.
 */
const NBSP = "\u00a0";

describe("currencyDisplayCode (M11)", () => {
  it("criterion 41a: swedish_krona renders SEK", () => {
    expect(currencyDisplayCode("swedish_krona")).toBe("SEK");
  });

  it("criterion 41b: danish_krona renders DKK", () => {
    expect(currencyDisplayCode("danish_krona")).toBe("DKK");
  });

  it("criterion 41c: euro renders EUR", () => {
    expect(currencyDisplayCode("euro")).toBe("EUR");
  });

  it("criterion 41d: a payload with no currency yet falls back to what the bootstrap writes", () => {
    expect(currencyDisplayCode(null)).toBe("SEK");
  });
});

describe("formatPerPiece (M12)", () => {
  it("criterion 42: renders a grid value whole, grouped with U+00A0", () => {
    expect(formatPerPiece(1140000, 6)).toBe(`1${NBSP}900`);
  });

  it("criterion 43: renders an off-grid saved value with its two decimals", () => {
    expect(formatPerPiece(855102, 6)).toBe(`1${NBSP}425,17`);
  });

  it("criterion 44: divides by one for the legally-zero quantity", () => {
    expect(formatPerPiece(855102, 0)).toBe(formatPerPiece(855102, 1));
    expect(formatPerPiece(1140000, 0)).toBe(`11${NBSP}400`);
  });
});
