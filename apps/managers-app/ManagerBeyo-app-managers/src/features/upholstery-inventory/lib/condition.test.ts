import { describe, expect, it } from "vitest";

import { deriveInventoryCondition } from "./condition";

describe("deriveInventoryCondition", () => {
  it("uses ordered precedence when active orders exist", () => {
    expect(
      deriveInventoryCondition({
        inventory_condition: "available",
        hasActiveOrder: true,
      }),
    ).toEqual({
      key: "ordered",
      label: "Ordered",
      variant: "active",
    });
  });

  it("maps stored inventory conditions otherwise", () => {
    expect(
      deriveInventoryCondition({
        inventory_condition: "low_stock",
        hasActiveOrder: false,
      }),
    ).toEqual({
      key: "low_stock",
      label: "Low stock",
      variant: "warning",
    });
  });
});
