import { describe, expect, it } from "vitest";

import { formatWorkingDuration } from "./format-working-duration";

describe("formatWorkingDuration", () => {
  it("shows only minutes for sub-hour durations", () => {
    expect(formatWorkingDuration(20 * 60)).toBe("20m");
  });

  it("shows hours and minutes without days", () => {
    expect(formatWorkingDuration(2 * 3600 + 20 * 60)).toBe("2h 20m");
  });

  it("shows days, hours, and minutes", () => {
    expect(formatWorkingDuration(86400 + 2 * 3600 + 20 * 60)).toBe("1d 2h 20m");
  });

  it("keeps a zero-hour segment once days are present", () => {
    expect(formatWorkingDuration(86400 + 5 * 60)).toBe("1d 0h 5m");
  });

  it("renders zero as 0m", () => {
    expect(formatWorkingDuration(0)).toBe("0m");
  });

  it("floors partial minutes and clamps negatives", () => {
    expect(formatWorkingDuration(59)).toBe("0m");
    expect(formatWorkingDuration(-100)).toBe("0m");
  });
});
