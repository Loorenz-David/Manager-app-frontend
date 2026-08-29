import { describe, expect, it } from "vitest";

import type { BudgetAllocationStep } from "@beyo/item-economics";

import {
  budgetToneFor,
  formatDurationHM,
  formatOverBudgetAmount,
  workerFacingAllowanceSeconds,
  workerFacingTypicalSeconds,
  type StepBudget,
} from "./step-budget";

describe("budgetToneFor", () => {
  it("stays calm through the first three quarters of the slice", () => {
    expect(budgetToneFor(0, 7200)).toBe("ok");
    expect(budgetToneFor(5399, 7200)).toBe("ok");
  });

  it("warns from three quarters consumed", () => {
    expect(budgetToneFor(5400, 7200)).toBe("warn");
    expect(budgetToneFor(7200, 7200)).toBe("warn");
  });

  it("turns over only once the slice is genuinely exceeded", () => {
    expect(budgetToneFor(7201, 7200)).toBe("over");
  });

  it("treats a slice that is zero or negative as already over", () => {
    // A section whose failed pass ate its whole slice is legitimately at or
    // below zero — dividing by it would be worse than calling it over.
    expect(budgetToneFor(0, 0)).toBe("over");
    expect(budgetToneFor(0, -600)).toBe("over");
  });
});

describe("workerFacingAllowanceSeconds", () => {
  it("caps a higher live pressure share at the static allowance", () => {
    expect(workerFacingAllowanceSeconds(3600, 4800)).toBe(3600);
  });

  it("uses a lower served pressure share as the worker target", () => {
    expect(workerFacingAllowanceSeconds(3600, 1200)).toBe(1200);
  });

  it("keeps zero distinct from a non-applicable pressure share", () => {
    expect(workerFacingAllowanceSeconds(3600, 0)).toBe(0);
    expect(workerFacingAllowanceSeconds(3600, null)).toBe(3600);
  });
});

describe("workerFacingTypicalSeconds", () => {
  function budgetFor(
    overrides: Partial<BudgetAllocationStep> = {},
  ): StepBudget {
    return {
      receivedAtMs: 0,
      step: {
        step_id: "tstp_example",
        working_section_id: "wsec_example",
        section_name_snapshot: "Upholstery Installation",
        typical_worker_seconds: 600,
        typical_unit_worker_seconds: "140",
        projected_typical_worker_seconds: 420,
        typical_basis: "item_narrowed",
        sample_count: 23,
        allowance_seconds: null,
        state: "pending",
        pressure_share_seconds: null,
        worked_seconds: 0,
        left_seconds: null,
        share_state: "no_budget",
        ...overrides,
      },
    };
  }

  it("reads the server projection, not the raw historical median", () => {
    // "usually ~Xm" answers how long *this* step should take. On a three-unit
    // task the raw 10m median would understate it by more than half.
    expect(workerFacingTypicalSeconds(budgetFor())).toBe(420);
  });

  it("falls back to the raw median only when no projection is served", () => {
    // A backend mid-deploy. Dropping the line entirely would be worse than
    // showing the pre-release number.
    expect(
      workerFacingTypicalSeconds(
        budgetFor({ projected_typical_worker_seconds: null }),
      ),
    ).toBe(600);
  });

  it("stays null when the section has no usable sample at all", () => {
    expect(
      workerFacingTypicalSeconds(
        budgetFor({
          typical_worker_seconds: null,
          typical_unit_worker_seconds: null,
          projected_typical_worker_seconds: null,
        }),
      ),
    ).toBeNull();
  });
});

describe("formatDurationHM", () => {
  it("drops the hour component below an hour", () => {
    expect(formatDurationHM(2640)).toBe("44m");
  });

  it("pads the minutes above an hour so the column stays aligned", () => {
    expect(formatDurationHM(7200)).toBe("2h 00m");
    expect(formatDurationHM(4440)).toBe("1h 14m");
  });

  it("floors to the minute rather than rounding up into a limit", () => {
    expect(formatDurationHM(119)).toBe("1m");
  });

  it("never renders a negative duration", () => {
    // The over-budget case is phrased separately, and by its absolute value.
    expect(formatDurationHM(-600)).toBe("0m");
  });
});

describe("formatOverBudgetAmount", () => {
  it("changes only when the displayed minute changes", () => {
    expect(formatOverBudgetAmount(1588)).toBe("26m");
    expect(formatOverBudgetAmount(5)).toBe("0m");
    expect(formatOverBudgetAmount(59)).toBe("0m");
    expect(formatOverBudgetAmount(60)).toBe("1m");
  });

  it("drops to minutes once the overrun passes an hour", () => {
    expect(formatOverBudgetAmount(3840)).toBe("1h 04m");
  });

  it("never renders a negative overrun", () => {
    expect(formatOverBudgetAmount(-60)).toBe("0m");
  });
});
