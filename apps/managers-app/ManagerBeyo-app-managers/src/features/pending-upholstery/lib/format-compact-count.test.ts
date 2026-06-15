import { describe, expect, it } from "vitest";

import { formatCompactCount } from "./format-compact-count";

describe("formatCompactCount", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [999, "999"],
    [1000, "1k"],
    [1100, "1.1k"],
    [1500, "1.5k"],
    [9900, "9.9k"],
    [10000, "10k"],
  ])("formats %i as %s", (input, expected) => {
    expect(formatCompactCount(input)).toBe(expected);
  });
});
