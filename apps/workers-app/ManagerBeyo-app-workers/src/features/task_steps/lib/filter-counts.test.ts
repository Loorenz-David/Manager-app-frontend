import { describe, expect, it } from "vitest";
import { countWorkingSectionStepFilters } from "./filter-counts";
import { DEFAULT_READINESS_STATUS_FILTERS, DEFAULT_STATE_FILTERS } from "./filter-defaults";

describe("countWorkingSectionStepFilters", () => {
  it("excludes defaults and counts selections in their drawers", () => {
    expect(countWorkingSectionStepFilters({
      states: DEFAULT_STATE_FILTERS,
      readinessStatuses: DEFAULT_READINESS_STATUS_FILTERS,
      taskTypes: [],
      categoryIds: [],
      itemPosition: "",
      groupByUpholstery: false,
    })).toEqual({ state: 0, task: 0, other: 0, total: 0 });

    expect(countWorkingSectionStepFilters({
      states: ["completed"],
      readinessStatuses: ["ready", "blocked"],
      taskTypes: ["return", "internal"],
      categoryIds: ["category-1", "category-2"],
      itemPosition: "A-1",
      groupByUpholstery: true,
    })).toEqual({ state: 3, task: 4, other: 2, total: 9 });
  });
});
