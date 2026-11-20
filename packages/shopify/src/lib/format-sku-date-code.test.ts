import { describe, expect, it } from "vitest";

import { formatSkuDateCode } from "./format-sku-date-code";

describe("formatSkuDateCode", () => {
  it("formats the local day as DDMMYY", () => {
    expect(formatSkuDateCode(new Date(2026, 10, 20))).toBe("201126");
    expect(formatSkuDateCode(new Date(2027, 0, 5))).toBe("050127");
  });
});
