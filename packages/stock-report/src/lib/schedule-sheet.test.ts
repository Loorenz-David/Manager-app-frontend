import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEDULE_TIME,
  composeScheduleInstant,
  isFutureInstant,
  scheduleDayOf,
  scheduleTimeOf,
  calendarToday,
} from "./schedule-sheet";

// Projection R18: every instant is built from local constructors, so the
// suite holds in any time zone (it also runs under America/Los_Angeles).
// Calendar days are UTC midnights — `DayCalendar`'s convention.
const day = (month: number, date: number) => new Date(Date.UTC(2026, month, date));

describe("schedule sheet arithmetic", () => {
  it("composes a calendar day and a local time into one instant on that local day", () => {
    expect(composeScheduleInstant(day(9, 7), "06:00")).toBe(new Date(2026, 9, 7, 6, 0).toISOString());
    expect(composeScheduleInstant(day(9, 7), "18:35")).toBe(new Date(2026, 9, 7, 18, 35).toISOString());
    // A late-evening local time never spills into the next day.
    expect(composeScheduleInstant(day(9, 31), "23:55")).toBe(new Date(2026, 9, 31, 23, 55).toISOString());
  });

  it("refuses a time that is not HH:MM", () => {
    expect(composeScheduleInstant(day(9, 7), "")).toBeNull();
    expect(composeScheduleInstant(day(9, 7), "24:00")).toBeNull();
    expect(composeScheduleInstant(day(9, 7), "6:00")).toBeNull();
  });

  it("reads a stored schedule back as its local calendar day and local time, whatever its offset", () => {
    // Early and late local hours: the ones whose UTC date differs from the local one.
    for (const hour of [0, 4, 23]) {
      const stored = new Date(2026, 9, 5, hour, 30);
      // The backend's own echo format (v10 §6.7): UTC with "+00:00".
      const echoed = stored.toISOString().replace(".000Z", "+00:00");
      expect(scheduleTimeOf(echoed)).toBe(`${String(hour).padStart(2, "0")}:30`);
      expect(scheduleDayOf(echoed)).toEqual(day(9, 5));
      // And a round trip through the sheet lands on the same instant.
      expect(composeScheduleInstant(scheduleDayOf(echoed)!, scheduleTimeOf(echoed))).toBe(stored.toISOString());
    }
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
    expect(calendarToday(now)).toEqual(day(9, 7));
    // Just before local midnight is still that local day.
    expect(calendarToday(new Date(2026, 9, 7, 23, 59).getTime())).toEqual(day(9, 7));
  });
});
