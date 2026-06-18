import { describe, expect, it } from "vitest";

import {
  formatMeters,
  isPositive,
  normalizeNonNegativeDecimalString,
} from "./decimal";

describe("upholstery inventory decimal helpers", () => {
  it("formats meters without losing trailing precision in display noise", () => {
    expect(formatMeters("12.500")).toBe("12.5 m");
    expect(formatMeters("0.125")).toBe("0.125 m");
    expect(formatMeters(null)).toBeNull();
  });

  it("compares decimal strings without parseFloat", () => {
    expect(isPositive("0.001")).toBe(true);
    expect(isPositive("0.000")).toBe(false);
    expect(isPositive(null)).toBe(false);
    expect(isPositive("not-a-number")).toBe(false);
  });

  it("normalizes non-negative input to backend precision", () => {
    expect(normalizeNonNegativeDecimalString("2,5")).toBe("2.500");
    expect(normalizeNonNegativeDecimalString("0.1254")).toBe("0.125");
    expect(normalizeNonNegativeDecimalString("-1")).toBeNull();
  });
});
