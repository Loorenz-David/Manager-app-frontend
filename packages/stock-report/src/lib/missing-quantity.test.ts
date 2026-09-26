import { describe, expect, it } from "vitest";

import { missingQuantityBounds } from "./missing-quantity";

const snapshot = (overrides: Partial<Parameters<typeof missingQuantityBounds>[0]> = {}) => ({
  quantity_requested: 10,
  quantity_in_queue: 2,
  quantity_in_progress: 1,
  quantity_awaiting: 3,
  quantity_missing: 0,
  ...overrides,
});

describe("missingQuantityBounds", () => {
  it("computes the backend's ceiling from the frozen demand less what is covered (§5.7)", () => {
    expect(missingQuantityBounds(snapshot())).toEqual({ ceiling: 4, missing: 0, markable: 4 });
  });

  it("leaves only the unregistered remainder to mark", () => {
    expect(missingQuantityBounds(snapshot({ quantity_missing: 3 }))).toEqual({ ceiling: 4, missing: 3, markable: 1 });
  });

  it("never goes negative when more is covered than requested", () => {
    // Over-assigned rows exist (state A7); the ceiling is clamped like the backend's.
    expect(missingQuantityBounds(snapshot({ quantity_awaiting: 12 }))).toEqual({ ceiling: 0, missing: 0, markable: 0 });
    // A stale missing count above the ceiling leaves nothing further to mark.
    expect(missingQuantityBounds(snapshot({ quantity_awaiting: 12, quantity_missing: 2 })).markable).toBe(0);
  });
});
