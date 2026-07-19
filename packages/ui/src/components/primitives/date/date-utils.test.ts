import { describe, expect, it } from "vitest";

import {
  resolveQuickRangeOption,
  serializeDateToISO,
  type CalendarQuickRangeOption,
} from "./date-utils";

// Wednesday, 2026-07-15 (UTC). getUTCDay() === 3.
const BASE = new Date("2026-07-15T09:30:00.000Z");

function resolve(option: CalendarQuickRangeOption) {
  const range = resolveQuickRangeOption(option, BASE);
  return {
    from: serializeDateToISO(range.from),
    to: serializeDateToISO(range.to),
  };
}

describe("resolveQuickRangeOption", () => {
  it("yesterday is the single prior UTC day", () => {
    expect(resolve({ id: "y", label: "Yesterday", kind: "yesterday" })).toEqual({
      from: "2026-07-14",
      to: "2026-07-14",
    });
  });

  it("last-n-days spans the trailing window including today", () => {
    expect(
      resolve({ id: "l2", label: "Last 2 days", kind: "last-n-days", amount: 2 }),
    ).toEqual({ from: "2026-07-14", to: "2026-07-15" });
  });

  it("last-n-days defaults to 2 days when amount is omitted", () => {
    expect(resolve({ id: "l", label: "Last", kind: "last-n-days" })).toEqual({
      from: "2026-07-14",
      to: "2026-07-15",
    });
  });

  it("this-week starts on the preceding Sunday through today", () => {
    // 2026-07-15 is a Wednesday; the Sunday of that week is 2026-07-12.
    expect(
      resolve({ id: "w", label: "This week", kind: "this-week" }),
    ).toEqual({ from: "2026-07-12", to: "2026-07-15" });
  });

  it("this-month starts on the first of the month through today", () => {
    expect(
      resolve({ id: "m", label: "This month", kind: "this-month" }),
    ).toEqual({ from: "2026-07-01", to: "2026-07-15" });
  });
});
