import { describe, expect, it } from "vitest";

import {
  formatScheduleLabel,
  formatVersionDayTitle,
  ordinalDay,
  sameInstant,
  versionScheduleState,
} from "./version-format";

// Local constructors only: the package's vitest config pins no TZ, and the
// suite also runs under a second zone (root `test:stock-report`), so an ISO
// literal would have one right answer per zone.
const NOW = new Date(2026, 8, 28, 12).getTime();
const local = (month: number, day: number, hour = 9, year = 2026) =>
  new Date(year, month, day, hour, 0, 0).toISOString();

describe("ordinalDay", () => {
  it("uses st / nd / rd except for the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinalDay)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st",
    ]);
  });
});

describe("formatVersionDayTitle", () => {
  it("reads 'Thu, 7th July' with no year for the current year (OC-7)", () => {
    // 2026-07-07 is a Tuesday; 2026-10-01 a Thursday.
    expect(formatVersionDayTitle(local(6, 7), NOW)).toBe("Tue, 7th July");
    expect(formatVersionDayTitle(local(9, 1), NOW)).toBe("Thu, 1st October");
  });

  it("appends the year only when it is not the current one", () => {
    expect(formatVersionDayTitle(local(6, 7, 9, 2025), NOW)).toBe("Mon, 7th July 2025");
  });

  it("reads the day in local time, so a late-evening creation keeps its day", () => {
    expect(formatVersionDayTitle(local(8, 27, 23), NOW)).toBe("Sun, 27th September");
  });

  it("degrades to a word on an unparseable date", () => {
    expect(formatVersionDayTitle("nope", NOW)).toBe("Untitled version");
  });
});

describe("formatScheduleLabel", () => {
  it("reads the local day and a 24-hour time with a short month", () => {
    expect(formatScheduleLabel(local(9, 7, 6), NOW)).toBe("Wed, 7th Oct · 06:00");
    expect(formatScheduleLabel(local(0, 3, 18, 2027), NOW)).toBe("Sun, 3rd Jan 2027 · 18:00");
  });

  it("accepts the backend's +00:00 echo as well as Z", () => {
    const instant = new Date(2026, 9, 7, 6, 0, 0);
    const offsetForm = instant.toISOString().replace("Z", "+00:00");
    expect(formatScheduleLabel(offsetForm, NOW)).toBe(formatScheduleLabel(instant.toISOString(), NOW));
  });
});

describe("versionScheduleState", () => {
  it("is overdue when a draft's schedule is at or before now, pending after (v7 §5.21)", () => {
    expect(versionScheduleState({ state: "draft", scheduled_activation_at: new Date(NOW - 60_000).toISOString() }, NOW)).toBe("overdue");
    expect(versionScheduleState({ state: "draft", scheduled_activation_at: new Date(NOW).toISOString() }, NOW)).toBe("overdue");
    expect(versionScheduleState({ state: "draft", scheduled_activation_at: new Date(NOW + 60_000).toISOString() }, NOW)).toBe("pending");
  });

  it("is none without a schedule, on any non-draft, and on a bad date", () => {
    expect(versionScheduleState({ state: "draft", scheduled_activation_at: null }, NOW)).toBe("none");
    expect(versionScheduleState({ state: "active", scheduled_activation_at: new Date(NOW - 1).toISOString() }, NOW)).toBe("none");
    expect(versionScheduleState({ state: "draft", scheduled_activation_at: "nope" }, NOW)).toBe("none");
  });
});

describe("sameInstant", () => {
  it("compares instants, not strings — the +00:00 echo equals the Z form (v10 §6.7)", () => {
    expect(sameInstant("2026-10-05T04:00:00+00:00", "2026-10-05T04:00:00.000Z")).toBe(true);
    expect(sameInstant("2026-10-05T06:00:00+02:00", "2026-10-05T04:00:00.000Z")).toBe(true);
    expect(sameInstant("2026-10-05T04:00:00+00:00", "2026-10-05T04:05:00.000Z")).toBe(false);
  });

  it("treats two nulls as the same and one null as different", () => {
    expect(sameInstant(null, null)).toBe(true);
    expect(sameInstant(null, "2026-10-05T04:00:00+00:00")).toBe(false);
    expect(sameInstant("2026-10-05T04:00:00+00:00", null)).toBe(false);
  });
});
