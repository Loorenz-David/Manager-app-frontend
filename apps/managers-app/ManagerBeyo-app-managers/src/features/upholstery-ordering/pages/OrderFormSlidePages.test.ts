import { describe, expect, it } from "vitest";

import {
  getPositiveAmountError,
  getReceivableAmountError,
} from "./OrderFormSlidePages";

describe("OrderFormSlidePages validation", () => {
  it("rejects empty, zero, and negative amounts", () => {
    expect(getPositiveAmountError("")).toBe("Enter a quantity greater than 0.");
    expect(getPositiveAmountError("0")).toBe("Enter a quantity greater than 0.");
    expect(getPositiveAmountError("-1")).toBe("Enter a quantity greater than 0.");
  });

  it("allows values at or below the remaining receivable amount", () => {
    expect(getReceivableAmountError("2.5", 2.5)).toBeNull();
    expect(getReceivableAmountError("2,25", 2.5)).toBeNull();
  });

  it("blocks values above the remaining receivable amount", () => {
    expect(getReceivableAmountError("2.501", 2.5)).toBe(
      "Maximum receivable is 2.5 m.",
    );
  });
});
