import { describe, expect, it } from "vitest";

import {
  budgetToneFor,
  formatDurationHM,
  formatOverBudgetAmount,
  workerFacingAllowanceSeconds,
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
  it("keeps the seconds visible while the overrun is small", () => {
    expect(formatOverBudgetAmount(1588)).toBe("26m 28s");
    expect(formatOverBudgetAmount(5)).toBe("0m 05s");
  });

  it("drops to minutes once the overrun passes an hour", () => {
    expect(formatOverBudgetAmount(3840)).toBe("1h 04m");
  });

  it("never renders a negative overrun", () => {
    expect(formatOverBudgetAmount(-60)).toBe("0m 00s");
  });
});
