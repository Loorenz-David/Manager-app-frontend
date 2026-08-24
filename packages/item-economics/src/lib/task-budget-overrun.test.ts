import { describe, expect, it } from "vitest";

import { buildTaskBudgetOverrun } from "./task-budget-overrun";

describe("buildTaskBudgetOverrun", () => {
  it("returns null when the task has no usable budget", () => {
    expect(
      buildTaskBudgetOverrun({ remaining_worker_minutes: null }),
    ).toBeNull();
  });

  it("returns null when the task is still within budget", () => {
    expect(
      buildTaskBudgetOverrun({ remaining_worker_minutes: "44.85" }),
    ).toBeNull();
  });

  it("returns null when remaining is exactly zero", () => {
    expect(
      buildTaskBudgetOverrun({ remaining_worker_minutes: "0.00" }),
    ).toBeNull();
  });

  it("returns the overrun once remaining goes negative", () => {
    expect(
      buildTaskBudgetOverrun({ remaining_worker_minutes: "-85.00" }),
    ).toEqual({
      overrunSeconds: 5100,
      label: "Over budget by 1h 25m",
    });
  });

  it("floors sub-hour overruns to a plain minutes label", () => {
    expect(
      buildTaskBudgetOverrun({ remaining_worker_minutes: "-20.00" }),
    ).toEqual({
      overrunSeconds: 1200,
      label: "Over budget by 20m",
    });
  });
});
