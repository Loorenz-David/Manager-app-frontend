import { describe, expect, it } from "vitest";

import {
  stockMatchFailureElementsFixture,
  stockMatchFailuresFixture,
} from "../fixtures/stock-report-fixtures";
import { toStockReportPropertyTags } from "../stock-report.types";
import {
  STOCK_MATCH_NO_VALUE,
  toStockMatchFailureRows,
} from "./stock-match-failure-rows";

function rowFor(
  reason: string,
  accepted: string[],
  item: string[],
  key = "wood_group",
) {
  return toStockMatchFailureRows([
    { key, reason, accepted_values: accepted, item_values: item },
  ])[0]!;
}

describe("toStockMatchFailureRows — the four reasons", () => {
  it("puts the accepted values beside the item's own for a rejected value", () => {
    const row = rowFor("value_not_accepted", ["light", "dark"], ["teak"]);

    expect(row).toEqual({
      key: "wood_group",
      label: "Wood group",
      asked: "Light / Dark",
      item: "Teak",
      reason: "value_not_accepted",
    });
  });

  it("marks an absent item value rather than leaving the cell blank", () => {
    const row = rowFor("missing_on_item", ["foam"], [], "upholstery");

    expect(row.asked).toBe("Foam");
    expect(row.item).toBe(STOCK_MATCH_NO_VALUE);
  });

  it("says the item's value belongs to no known group, keeping the value", () => {
    const row = rowFor("no_group_for_value", ["light"], ["teak"], "wood_type");

    expect(row.item).toBe("No known group: Teak");
  });

  it("calls a malformed criterion invalid instead of 'accepts nothing'", () => {
    const row = rowFor("criterion_not_understood", [], [], "finish");

    expect(row.asked).toBe("Invalid criterion");
    expect(row.item).toBe(STOCK_MATCH_NO_VALUE);
  });
});

describe("toStockMatchFailureRows — the edges", () => {
  it("still renders both columns for a reason it has never seen", () => {
    const row = rowFor("some_future_reason", ["light"], ["teak"]);

    expect(row.asked).toBe("Light");
    expect(row.item).toBe("Teak");
    expect(row.reason).toBe("some_future_reason");
  });

  it("shows an em dash, never 'accepts nothing', for empty accepted values", () => {
    const row = rowFor("value_not_accepted", [], ["teak"]);

    expect(row.asked).toBe(STOCK_MATCH_NO_VALUE);
  });

  it("renders a quantity failure through the same row — it is a value set, not a rule", () => {
    const row = rowFor("value_not_accepted", ["4"], ["7"], "quantity");

    expect(row).toMatchObject({ label: "Quantity", asked: "4", item: "7" });
  });

  it("maps every failure it is given, in order, and nothing else", () => {
    expect(toStockMatchFailureRows(stockMatchFailureElementsFixture)).toEqual(
      stockMatchFailuresFixture,
    );
  });
});

describe("toStockMatchFailureRows — one formatter with the board", () => {
  it("formats the asked values exactly as the board formats the same criterion", () => {
    const tag = toStockReportPropertyTags({ wood_group: ["light", "dark"] })[0];
    const row = rowFor("value_not_accepted", ["light", "dark"], ["teak"]);

    // The board writes `Wood Group: Light / Dark`; the sheet must not invent a
    // second spelling of the values behind the colon.
    expect(tag).toBe("Wood Group: Light / Dark");
    expect(tag!.endsWith(row.asked)).toBe(true);
  });
});
