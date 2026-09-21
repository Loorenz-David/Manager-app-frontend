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
  // One worker on the task, accruing in real time — the baseline these cases
  // were written against, before the rate was published.
  live_accrual_rate: "1.0000",
  ...overrides,
});

describe("buildTaskBudgetSignalDisplay — live accrual rate", () => {
  const overSignal = (rate: string | null) =>
    signal({
      budget_state: "over",
      over_seconds: 600,
      over_cost_minor: 1_000,
      allowed_seconds: 3_000,
      actual_worked_seconds: 3_600,
      live_accrual_rate: rate,
    });

  it("holds still when nothing is running on the task", () => {
    // The defect this rule exists for: an idle task's overrun crept upward
    // between polls and snapped back on each one, on a money-facing surface.
    const idle = buildTaskBudgetSignalDisplay(overSignal(null), 300_000);
    const untouched = buildTaskBudgetSignalDisplay(overSignal(null), 0);

    expect(idle).toEqual(untouched);
  });

  it("advances at the served rate rather than in real time", () => {
    // Two minutes of wall clock on a task whose single worker is splitting
    // across three steps is forty seconds of task time, not one hundred twenty.
    const shared = buildTaskBudgetSignalDisplay(overSignal("0.3333"), 120_000);
    const sole = buildTaskBudgetSignalDisplay(overSignal("1.0000"), 40_000);

    expect(shared?.label).toBe(sole?.label);
  });

  it("lets two workers on one task outpace the wall clock", () => {
    const paired = buildTaskBudgetSignalDisplay(overSignal("2.0000"), 60_000);

    // 600s served + 120s accrued.
    expect(paired?.label).toBe("Over budget by 12m");
  });

  it("ignores a malformed rate rather than ticking on garbage", () => {
    expect(
      buildTaskBudgetSignalDisplay(overSignal("not-a-number"), 300_000),
    ).toEqual(buildTaskBudgetSignalDisplay(overSignal(null), 0));
  });
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
      costLabel: "123,45\u00a0kr",
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
      costLabel: "9\u00a0€",
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
