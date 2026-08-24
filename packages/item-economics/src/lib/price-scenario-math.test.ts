import { describe, expect, it } from "vitest";

import { PriceScenarioModelSchema, type PriceScenarioModel } from "../types";
import {
  allowanceSeconds,
  budgetMinor,
  formatAllowanceDuration,
  formatAllowedWorkerMinutes,
  roundHalfEven,
} from "./price-scenario-math";

/**
 * The published model of handoff §9.2, parsed through the production schema so
 * these invariants run on the object type the screen actually holds.
 */
const REFERENCE_MODEL: PriceScenarioModel = PriceScenarioModelSchema.parse({
  cost_model_version_id: "cmv_7a1",
  basis_version_id: "pcbv_3f9",
  residual_percent_milli: 22000,
  constant_deduction_minor: 0,
  cost_per_worker_minute_ten_thousandths: 13000000,
  budget_cap_percent_milli: 25000,
  is_purely_proportional: true,
});

/**
 * The same model with the one constant that makes a budget go negative
 * (criterion 6): §9.2's zero deduction can never produce one.
 */
const DEDUCTING_MODEL: PriceScenarioModel = PriceScenarioModelSchema.parse({
  ...REFERENCE_MODEL,
  constant_deduction_minor: 50000,
});

/**
 * A residual slope (30%) steeper than the 25% cap, so `budgetMinor` must
 * bind on `cap_affine(P)` rather than `residual_affine(P)`
 * (`HANDOFF_TO_FRONTEND_production_budget_cap_20260820.md`).
 */
const CAPPED_MODEL: PriceScenarioModel = PriceScenarioModelSchema.parse({
  ...REFERENCE_MODEL,
  residual_percent_milli: 30000,
});

describe("roundHalfEven (M2, handoff §9.1)", () => {
  it("criterion 1: rounds -3/2 to the even -2, not the truncated -1", () => {
    expect(roundHalfEven(-3n, 2n)).toBe(-2n);
  });

  it("criterion 2: rounds the negative tie -5/2 to the even -2", () => {
    expect(roundHalfEven(-5n, 2n)).toBe(-2n);
  });

  it("criterion 3: rounds 3/2 to the even 2", () => {
    expect(roundHalfEven(3n, 2n)).toBe(2n);
  });

  it("criterion 4: rounds the positive tie 5/2 to the even 2", () => {
    expect(roundHalfEven(5n, 2n)).toBe(2n);
  });
});

describe("the allowance pipeline (M2, handoff §4)", () => {
  it("criterion 5: reproduces the server's 8681 seconds at P = 855 000", () => {
    expect(allowanceSeconds(855000, REFERENCE_MODEL)).toBe(8681);
  });

  it("criterion 6: returns an exactly negative budget below the deduction", () => {
    expect(budgetMinor(100000, DEDUCTING_MODEL)).toBe(-28000n);
  });

  it("returns the exact positive budget of the published model", () => {
    expect(budgetMinor(855000, REFERENCE_MODEL)).toBe(188100n);
  });

  it("binds the budget to the v2 cap when the residual slope exceeds it", () => {
    // residual_affine(1_000_000) = round(1_000_000 × 0.30) = 300_000
    // cap_affine(1_000_000)      = round(1_000_000 × 0.25) = 250_000
    expect(budgetMinor(1_000_000, CAPPED_MODEL)).toBe(250000n);
  });

  it("leaves the budget on the residual slope when the cap does not bind", () => {
    // residual_percent_milli (22%) stays under the 25% cap for every price, so
    // REFERENCE_MODEL's uncapped values (criteria 6/7) must be unaffected by
    // the v2 min(residual, cap) change.
    expect(budgetMinor(300000, REFERENCE_MODEL)).toBe(66000n);
  });
});

describe("formatAllowanceDuration (M3)", () => {
  it("criterion 8: rounds 8681 s to the nearest minute — 2h 25m, not 2h 24m", () => {
    expect(formatAllowanceDuration(8681)).toBe("2h 25m");
  });

  it("criterion 9: renders a negative allowance as 0m", () => {
    expect(formatAllowanceDuration(-1)).toBe("0m");
  });

  it("criterion 10: keeps the zero minutes of a whole hour — 3h 0m", () => {
    expect(formatAllowanceDuration(3 * 3600)).toBe("3h 0m");
  });

  it("criterion 11: renders under an hour without the hours part", () => {
    expect(formatAllowanceDuration(45 * 60)).toBe("45m");
  });
});

describe("formatAllowedWorkerMinutes (M8)", () => {
  it("criterion 12: renders 16 000 centi-minutes as the response's 160.00", () => {
    expect(formatAllowedWorkerMinutes(16000n)).toBe("160.00");
  });

  it("criterion 13: signs a negative sub-unit quotient — -5 → -0.05", () => {
    expect(formatAllowedWorkerMinutes(-5n)).toBe("-0.05");
  });
});
