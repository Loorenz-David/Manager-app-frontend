import { describe, expect, it } from "vitest";

import { checkOrderAmountDraft } from "./order-amount";

const order = { currentMeters: 4.5, receivedMeters: 2 };

describe("checkOrderAmountDraft", () => {
  it("has nothing to save for an empty or unchanged value", () => {
    expect(checkOrderAmountDraft("", order)).toEqual({ ok: false, error: null });
    expect(checkOrderAmountDraft("4,500", order)).toEqual({ ok: false, error: null });
  });

  it("refuses invalid, zero and below-received amounts", () => {
    expect(checkOrderAmountDraft("abc", order)).toEqual({
      ok: false,
      error: "Enter a valid amount in meters.",
    });
    expect(checkOrderAmountDraft("0", { currentMeters: 1, receivedMeters: 0 })).toEqual({
      ok: false,
      error: "The amount must be more than 0 m.",
    });
    expect(checkOrderAmountDraft("1.999", order)).toEqual({
      ok: false,
      error: "Can't be less than the 2.000 m already received.",
    });
  });

  it("accepts the received amount itself and flags decreases", () => {
    expect(checkOrderAmountDraft("2", order)).toEqual({
      ok: true,
      value: "2.000",
      isDecrease: true,
    });
    expect(checkOrderAmountDraft("6.25", order)).toEqual({
      ok: true,
      value: "6.250",
      isDecrease: false,
    });
  });
});
