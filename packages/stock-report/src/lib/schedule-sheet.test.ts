import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEDULE_TIME,
  composeScheduleInstant,
  isFutureInstant,
  scheduleDayOf,
  scheduleTimeOf,
  startOfLocalDay,
} from "./schedule-sheet";

// Projection R18: every expectation is built from local constructors, so the
// suite holds in any time zone (it also runs under America/Los_Angeles).
describe("schedule sheet arithmetic", () => {
  it("composes a local day and a local time into one instant", () => {
    expect(composeScheduleInstant(new Date(2026, 9, 7), "06:00")).toBe(new Date(2026, 9, 7, 6, 0).toISOString());
    expect(composeScheduleInstant(new Date(2026, 9, 7, 23, 59), "18:35")).toBe(new Date(2026, 9, 7, 18, 35).toISOString());
  });

  it("refuses a time that is not HH:MM", () => {
    expect(composeScheduleInstant(new Date(2026, 9, 7), "")).toBeNull();
    expect(composeScheduleInstant(new Date(2026, 9, 7), "24:00")).toBeNull();
    expect(composeScheduleInstant(new Date(2026, 9, 7), "6:00")).toBeNull();
  });

  it("reads a stored schedule back as its local day and local time, whatever its offset", () => {
    const stored = new Date(2026, 9, 5, 4, 0);
    // The backend's own echo format (v10 §6.7): UTC with "+00:00".
    const echoed = stored.toISOString().replace(".000Z", "+00:00");
    expect(scheduleTimeOf(echoed)).toBe("04:00");
    expect(scheduleDayOf(echoed)).toEqual(new Date(2026, 9, 5));
  });

  it("starts at 06:00 without a schedule", () => {
    expect(scheduleTimeOf(null)).toBe(DEFAULT_SCHEDULE_TIME);
    expect(DEFAULT_SCHEDULE_TIME).toBe("06:00");
    expect(scheduleDayOf(null)).toBeUndefined();
  });

  it("counts only a strictly later instant as the future", () => {
    const now = new Date(2026, 9, 7, 6, 0).getTime();
    expect(isFutureInstant(new Date(2026, 9, 7, 6, 5).toISOString(), now)).toBe(true);
    expect(isFutureInstant(new Date(2026, 9, 7, 6, 0).toISOString(), now)).toBe(false);
    expect(startOfLocalDay(now)).toEqual(new Date(2026, 9, 7));
  });
});
