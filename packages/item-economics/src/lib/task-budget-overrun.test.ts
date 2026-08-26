import { describe, expect, it } from "vitest";

import { buildTaskBudgetSignalDisplay } from "./task-budget-overrun";

const signal = (overrides: Record<string, unknown> = {}) => ({
  task_id: "tsk_one",
  budget_state: "within_budget" as const,
  over_seconds: 0,
  over_cost_minor: 0,
  projected_over_seconds: 0,
  projected_over_cost_minor: 0,
  currency: "swedish_krona" as const,
  allowed_seconds: 3_000,
  actual_worked_seconds: 2_000,
  cost_per_worker_minute_ten_thousandths: 37_500,
  ...overrides,
});

describe("buildTaskBudgetSignalDisplay", () => {
  it.each(["within_budget", "no_budget"] as const)(
    "does not render a footer for %s",
    (budget_state) => {
      expect(buildTaskBudgetSignalDisplay(signal({ budget_state }))).toBeNull();
    },
  );

  it("renders the served actual-over cost and only advances its time", () => {
    expect(
      buildTaskBudgetSignalDisplay(
        signal({
          budget_state: "over",
          over_seconds: 5_100,
          over_cost_minor: 12_345,
          allowed_seconds: 3_000,
          actual_worked_seconds: 8_100,
        }),
        61_000,
      ),
    ).toEqual({
      tone: "over",
      label: "Over budget by 1h 26m",
      costLabel: "123,45 kr",
    });
  });

  it("renders an amber projection with its served forecast cost", () => {
    expect(
      buildTaskBudgetSignalDisplay(
        signal({
          budget_state: "projected_over",
          projected_over_seconds: 3_600,
          projected_over_cost_minor: 900,
          currency: "euro",
        }),
      ),
    ).toEqual({
      tone: "projected_over",
      label: "Projected over by 1h 0m",
      costLabel: "9 €",
    });
  });

  it("does not fabricate a money label for the no-currency sentinel", () => {
    expect(buildTaskBudgetSignalDisplay(signal({
      budget_state: "over",
      over_seconds: 60,
      actual_worked_seconds: 3_060,
      currency: "no_currency",
    }))?.costLabel).toBeNull();
  });
});
