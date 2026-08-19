import { describe, expect, it } from "vitest";

import { PriceScenarioAnchorsSchema, type PriceScenarioAnchors } from "../types";
import { resolveCoverage } from "./price-coverage";

/** The reference payload's anchors, on the standard 15 000-step band. */
const ANCHORS: PriceScenarioAnchors = PriceScenarioAnchorsSchema.parse({
  is_fundable: true,
  break_even_price_minor: 1211335,
  suggested_price_minor: 1215000,
  infeasible_at_or_below_minor: 29,
});

const STEP_MINOR = 15000;

describe("resolveCoverage (M7)", () => {
  it("criterion 38: the chip reads covered exactly at the break-even anchor", () => {
    expect(resolveCoverage(1211335, ANCHORS)).toEqual({
      showChip: true,
      isCovered: true,
      markerMinor: 1215000,
    });
  });

  it("criterion 39: one step below the anchor it does not", () => {
    expect(resolveCoverage(1211335 - STEP_MINOR, ANCHORS).isCovered).toBe(false);
  });

  it("criterion 40: a non-fundable item shows neither chip nor marker", () => {
    // is_fundable false is the only reason here — the break-even member is
    // still populated, so a check that read only the member would pass wrongly.
    const nonFundable = PriceScenarioAnchorsSchema.parse({
      ...ANCHORS,
      is_fundable: false,
    });

    const coverage = resolveCoverage(1_500_000, nonFundable);

    expect(coverage.showChip).toBe(false);
    expect(coverage.markerMinor).toBeNull();
  });

  it("hides the chip when no price funds the typical work", () => {
    const noBreakEven = PriceScenarioAnchorsSchema.parse({
      ...ANCHORS,
      break_even_price_minor: null,
    });

    expect(resolveCoverage(1_500_000, noBreakEven).showChip).toBe(false);
  });

  it("hides the chip and the marker when the whole block is missing", () => {
    expect(resolveCoverage(1_500_000, null)).toEqual({
      showChip: false,
      isCovered: false,
      markerMinor: null,
    });
  });

  it("keeps the chip and drops only the marker when the suggestion is null", () => {
    const noSuggestion = PriceScenarioAnchorsSchema.parse({
      ...ANCHORS,
      suggested_price_minor: null,
    });

    expect(resolveCoverage(1_500_000, noSuggestion)).toEqual({
      showChip: true,
      isCovered: true,
      markerMinor: null,
    });
  });
});
