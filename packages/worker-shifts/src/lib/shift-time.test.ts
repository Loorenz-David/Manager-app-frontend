import { describe, expect, it } from "vitest";
import {
  AFTERNOON_START_HOUR,
  EVENING_START_HOUR,
  MORNING_START_HOUR,
  dayPartGreeting,
  elapsedSecondsSince,
  firstName,
  formatElapsedDuration,
  formatTimeInTimeZone,
} from "./shift-time";

describe("shift-time helpers", () => {
  it("exports the approved greeting cutoffs", () => {
    expect(MORNING_START_HOUR).toBe(5);
    expect(AFTERNOON_START_HOUR).toBe(12);
    expect(EVENING_START_HOUR).toBe(18);
  });

  it("calculates elapsed seconds from an injected now", () => {
    const now = new Date("2026-07-29T08:00:10Z");
    expect(elapsedSecondsSince("2026-07-29T06:58:00Z", now)).toBe(3730);
    expect(elapsedSecondsSince(null, now)).toBeNull();
    expect(elapsedSecondsSince("not-a-date", now)).toBeNull();
    expect(elapsedSecondsSince("2026-07-29T09:00:00Z", now)).toBe(0);
  });

  it("formats elapsed seconds as hours and minutes", () => {
    expect(formatElapsedDuration(59)).toBe("0m");
    expect(formatElapsedDuration(3720)).toBe("1h 2m");
    expect(formatElapsedDuration(29520)).toBe("8h 12m");
  });

  it("formats HH:mm in the requested IANA time zone", () => {
    const timestamp = "2026-07-29T06:58:00Z";
    expect(formatTimeInTimeZone(timestamp, "UTC")).toBe("06:58");
    expect(formatTimeInTimeZone(timestamp, "Europe/Stockholm")).toBe("08:58");
    expect(formatTimeInTimeZone(timestamp, "Asia/Jerusalem")).toBe("09:58");
  });

  it("extracts the first whitespace-separated name", () => {
    expect(firstName("  Mykola   Petrenko ")).toBe("Mykola");
    expect(firstName("")).toBe("");
  });

  it("uses approved day-part boundaries in the workspace time zone", () => {
    expect(dayPartGreeting("UTC", new Date("2026-07-29T04:59:59Z"))).toBe(
      "evening",
    );
    expect(dayPartGreeting("UTC", new Date("2026-07-29T05:00:00Z"))).toBe(
      "morning",
    );
    expect(dayPartGreeting("UTC", new Date("2026-07-29T11:59:59Z"))).toBe(
      "morning",
    );
    expect(dayPartGreeting("UTC", new Date("2026-07-29T12:00:00Z"))).toBe(
      "afternoon",
    );
    expect(dayPartGreeting("UTC", new Date("2026-07-29T17:59:59Z"))).toBe(
      "afternoon",
    );
    expect(dayPartGreeting("UTC", new Date("2026-07-29T18:00:00Z"))).toBe(
      "evening",
    );
  });

  it("evaluates the same instant differently across workspace time zones", () => {
    const now = new Date("2026-07-29T02:30:00Z");
    expect(dayPartGreeting("Europe/Stockholm", now)).toBe("evening");
    expect(dayPartGreeting("Asia/Jerusalem", now)).toBe("morning");
  });
});
