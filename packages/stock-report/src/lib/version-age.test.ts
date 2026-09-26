import { describe, expect, it } from "vitest";

import { formatVersionAge, formatVersionRequested, versionDaysRunning } from "./version-age";

const NOON_26 = new Date(2026, 8, 26, 12, 0, 0).getTime();
const local = (day: number, hour = 9) => new Date(2026, 8, day, hour, 0, 0).toISOString();

describe("versionDaysRunning", () => {
  it("counts whole local calendar days from the day the version opened", () => {
    expect(versionDaysRunning(local(26, 8), null, NOON_26)).toBe(0);
    // Opened last night: this morning it is already "1 day", like a due date.
    expect(versionDaysRunning(local(25, 23), null, NOON_26)).toBe(1);
    expect(versionDaysRunning(local(24), null, NOON_26)).toBe(2);
  });

  it("measures a closed version to its close, not to now", () => {
    expect(versionDaysRunning(local(20), local(23), NOON_26)).toBe(3);
  });

  it("is null for an unparseable date and never negative", () => {
    expect(versionDaysRunning("not a date", null, NOON_26)).toBeNull();
    expect(versionDaysRunning(local(28), null, NOON_26)).toBe(0);
  });
});

describe("formatVersionAge", () => {
  it("counts forward for the active version, as the owner asked", () => {
    expect(formatVersionAge(local(26), null, NOON_26)).toBe("Started today");
    expect(formatVersionAge(local(25), null, NOON_26)).toBe("1 day running");
    expect(formatVersionAge(local(24), null, NOON_26)).toBe("2 days running");
  });

  it("reports how long a closed version ran", () => {
    expect(formatVersionAge(local(20), local(20, 18), NOON_26)).toBe("Closed the same day");
    expect(formatVersionAge(local(20), local(21), NOON_26)).toBe("Ran 1 day");
    expect(formatVersionAge(local(20), local(23), NOON_26)).toBe("Ran 3 days");
  });

  it("degrades to a bare word rather than 'NaN days' on a bad date", () => {
    expect(formatVersionAge("nope", null, NOON_26)).toBe("Running");
    expect(formatVersionAge("nope", local(23), NOON_26)).toBe("Closed");
  });
});

describe("formatVersionRequested", () => {
  it("counts the units a version asked for, singular at one, never negative", () => {
    expect(formatVersionRequested(19)).toBe("19 units requested");
    expect(formatVersionRequested(1)).toBe("1 unit requested");
    expect(formatVersionRequested(0)).toBe("0 units requested");
    expect(formatVersionRequested(-3)).toBe("0 units requested");
  });
});
