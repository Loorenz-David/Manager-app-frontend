import { describe, expect, it } from "vitest";

import {
  formatSlideDuration,
  parseSlideDuration,
  roundSlideDurationMs,
  SLIDE_DURATION_MIN_MS,
} from "./slide-duration";

describe("slide duration rules", () => {
  it("snaps to the authoring step and enforces the floor with no ceiling", () => {
    expect(roundSlideDurationMs(4_240)).toBe(4_000);
    expect(roundSlideDurationMs(4_260)).toBe(4_500);
    expect(roundSlideDurationMs(100)).toBe(SLIDE_DURATION_MIN_MS);
    // The backend only requires duration_ms > 0 — long slides must survive the store.
    expect(roundSlideDurationMs(90_000)).toBe(90_000);
    expect(roundSlideDurationMs(600_000)).toBe(600_000);
    expect(roundSlideDurationMs(Number.NaN)).toBe(SLIDE_DURATION_MIN_MS);
  });

  it("formats seconds under a minute and m:ss above", () => {
    expect(formatSlideDuration(4)).toBe("4.0s");
    expect(formatSlideDuration(12)).toBe("12.0s");
    expect(formatSlideDuration(59.5)).toBe("59.5s");
    expect(formatSlideDuration(60)).toBe("1:00");
    expect(formatSlideDuration(90)).toBe("1:30");
    expect(formatSlideDuration(90.5)).toBe("1:30.5");
    expect(formatSlideDuration(605)).toBe("10:05");
  });

  it("parses what an author would actually type", () => {
    expect(parseSlideDuration("8")).toBe(8);
    expect(parseSlideDuration("8s")).toBe(8);
    expect(parseSlideDuration("4.5 sec")).toBe(4.5);
    expect(parseSlideDuration("90")).toBe(90);
    expect(parseSlideDuration("1:30")).toBe(90);
    expect(parseSlideDuration("10:05")).toBe(605);
    expect(parseSlideDuration("1:30.5")).toBe(90.5);
    expect(parseSlideDuration("2m")).toBe(120);
    expect(parseSlideDuration("2 min")).toBe(120);
    expect(parseSlideDuration("2 minutes")).toBe(120);
    expect(parseSlideDuration("500ms")).toBe(0.5);
    expect(parseSlideDuration("  12  ")).toBe(12);
  });

  it("returns null for text that is not a duration, so the old value stands", () => {
    expect(parseSlideDuration("")).toBeNull();
    expect(parseSlideDuration("abc")).toBeNull();
    expect(parseSlideDuration("1:75")).toBeNull();
    expect(parseSlideDuration("-4")).toBeNull();
    expect(parseSlideDuration("4s5")).toBeNull();
  });
});
