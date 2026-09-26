import { describe, expect, it } from "vitest";

import {
  LEGEND_SWATCH_CLASS,
  MATCH_WARNING_BANNER_CLASS,
  SEGMENT_FILL_CLASS,
  SEGMENT_INK_CLASS,
} from "./stock-report-theme";

/**
 * Owner, 2026-09-26: amber means *missing* now, and the queue is neutral grey
 * because it is static rather than active or accomplished. The bar and legend
 * tests only assert that they wear these classes; this is the test that says
 * which colours they are.
 */
describe("SEGMENT_FILL_CLASS", () => {
  it("gives fulfilled work a bright green with white ink", () => {
    expect(SEGMENT_FILL_CLASS.fulfilled).toBe("bg-[#16a34a]");
    expect(SEGMENT_INK_CLASS.fulfilled).toBe("text-white");
    expect(LEGEND_SWATCH_CLASS.fulfilled).toBe(SEGMENT_FILL_CLASS.fulfilled);
  });

  it("gives the queue a neutral grey and the missing segment the bright amber", () => {
    expect(SEGMENT_FILL_CLASS.inQueue).toBe("bg-[#6b7280]");
    expect(SEGMENT_FILL_CLASS.missing).toBe("bg-[#d99e0b]");
    expect(SEGMENT_INK_CLASS.missing).toBe("text-white");
    expect(LEGEND_SWATCH_CLASS.missing).toBe(SEGMENT_FILL_CLASS.missing);
  });

  it("names complete classes only", () => {
    for (const className of Object.values(SEGMENT_FILL_CLASS)) {
      expect(className).not.toMatch(/[${}]/);
    }
  });
});

describe("MATCH_WARNING_BANNER_CLASS", () => {
  // The components that wear this banner assert only that they wear the same
  // one, which would hold just as well if it turned grey. This is the test that
  // says which colour it is.
  it("is the app's amber warning trio, not a neutral card", () => {
    expect(MATCH_WARNING_BANNER_CLASS).toBe(
      "border-[#f0c36a] bg-[#fff4d6] text-warning",
    );
  });

  it("names complete classes, which is the only kind Tailwind's scanner sees", () => {
    for (const className of MATCH_WARNING_BANNER_CLASS.split(" ")) {
      expect(className).not.toMatch(/[${}]/);
    }
  });
});
