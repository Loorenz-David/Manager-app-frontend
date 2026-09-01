import { describe, expect, it } from "vitest";

import type { TaskStep } from "../types";

import {
  hasNoAvailableUpholstery,
  hasNoUpholsterySelected,
  isUpholsteryWarningSection,
} from "./step-transition-guards";

function stepWithRequirementStates(states: string[]): TaskStep {
  return {
    item: {
      upholstery_requirement: states.map((state, index) => ({
        client_id: `iur_${index}`,
        state,
        source: "inventory",
        amount_meters: 3.5,
      })),
    },
  } as unknown as TaskStep;
}

describe("isUpholsteryWarningSection", () => {
  it("matches the guarded sections regardless of casing or padding", () => {
    expect(isUpholsteryWarningSection("Upholstery Installation")).toBe(true);
    expect(isUpholsteryWarningSection("  sewing ")).toBe(true);
  });

  it("leaves every other section ungated", () => {
    expect(isUpholsteryWarningSection("upholstery removal")).toBe(false);
  });
});

describe("hasNoAvailableUpholstery", () => {
  it("lets a step start while the fabric is still reserved but unused", () => {
    expect(hasNoAvailableUpholstery(stepWithRequirementStates(["available"]))).toBe(
      false,
    );
  });

  // `in_use` and `completed` are one-way promotions applied by the backend when
  // an "upholstery installation" step starts and completes, and nothing moves
  // them back to `available`. Gating on `available` alone made every later
  // guarded step on the same item report the fabric as missing.
  it("lets a step start once the fabric is in use or already consumed", () => {
    expect(hasNoAvailableUpholstery(stepWithRequirementStates(["in_use"]))).toBe(
      false,
    );
    expect(
      hasNoAvailableUpholstery(stepWithRequirementStates(["completed"])),
    ).toBe(false);
  });

  it("blocks a step whose fabric is genuinely not there yet", () => {
    expect(hasNoAvailableUpholstery(stepWithRequirementStates(["ordered"]))).toBe(
      true,
    );
    expect(
      hasNoAvailableUpholstery(
        stepWithRequirementStates(["needs_ordering", "missing_quantity"]),
      ),
    ).toBe(true);
  });

  it("passes on a single resolved requirement among unresolved ones", () => {
    expect(
      hasNoAvailableUpholstery(stepWithRequirementStates(["ordered", "in_use"])),
    ).toBe(false);
  });

  it("stays out of the way when the item carries no requirements at all", () => {
    expect(hasNoAvailableUpholstery(stepWithRequirementStates([]))).toBe(false);
  });
});

describe("hasNoUpholsterySelected", () => {
  it("reports an item with no requirement rows", () => {
    expect(hasNoUpholsterySelected(stepWithRequirementStates([]))).toBe(true);
    expect(hasNoUpholsterySelected(stepWithRequirementStates(["ordered"]))).toBe(
      false,
    );
  });
});
