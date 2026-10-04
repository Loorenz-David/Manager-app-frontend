import { describe, expect, it } from "vitest";
import { countTaskSheetFilters } from "./task-filter-counts";

describe("countTaskSheetFilters", () => {
  it("counts nondefault task, wagon, and upholstery selections", () => {
    expect(countTaskSheetFilters({ taskType: "all", itemPosition: "", groupByUpholstery: false }))
      .toEqual({ task: 0, other: 0, total: 0 });
    expect(countTaskSheetFilters({ taskType: "return", itemPosition: " 3 ", groupByUpholstery: true }))
      .toEqual({ task: 1, other: 2, total: 3 });
  });
});
