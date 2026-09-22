import { describe, expect, it } from "vitest";

import { MATCH_WARNING_BANNER_CLASS } from "./stock-report-theme";

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
