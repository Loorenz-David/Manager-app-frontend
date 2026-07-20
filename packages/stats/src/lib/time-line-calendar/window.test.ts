import { describe, expect, it } from "vitest";

import { endOfLocalDay, parseLocalDateKey, utcDateKeyOfInstant } from "./local-date";
import {
  computeWindow,
  requestRangeUtc,
  visibleDatesFor,
  windowCovers,
} from "./window";

const TODAY = "2026-07-19";

describe("visibleDatesFor", () => {
  it("shows one date in day mode", () => {
    expect(visibleDatesFor("2026-07-15", "day")).toEqual(["2026-07-15"]);
  });

  it("shows the focus date as the newest of three in threeDay mode", () => {
    expect(visibleDatesFor("2026-07-15", "threeDay")).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
    ]);
  });
});

describe("computeWindow", () => {
  it("centers a five-day window around a historical single day", () => {
    expect(computeWindow(["2026-07-10"], TODAY)).toEqual({
      dateFrom: "2026-07-08",
      dateTo: "2026-07-12",
    });
  });

  it("clamps at today and shifts the lower bound to keep five dates", () => {
    expect(computeWindow([TODAY], TODAY)).toEqual({
      dateFrom: "2026-07-15",
      dateTo: TODAY,
    });
  });

  it("pads a three-day range by one date on each side", () => {
    expect(
      computeWindow(["2026-07-10", "2026-07-11", "2026-07-12"], TODAY),
    ).toEqual({ dateFrom: "2026-07-09", dateTo: "2026-07-13" });
  });

  it("clamps a three-day range ending today", () => {
    expect(
      computeWindow(["2026-07-17", "2026-07-18", TODAY], TODAY),
    ).toEqual({ dateFrom: "2026-07-15", dateTo: TODAY });
  });
});

describe("windowCovers (hysteresis)", () => {
  const loaded = { dateFrom: "2026-07-08", dateTo: "2026-07-12" };

  it("is false without a loaded window", () => {
    expect(windowCovers(null, ["2026-07-10"], TODAY)).toBe(false);
  });

  it("keeps the window while visible dates sit inside with margin", () => {
    expect(windowCovers(loaded, ["2026-07-10"], TODAY)).toBe(true);
    expect(windowCovers(loaded, ["2026-07-09"], TODAY)).toBe(true);
    expect(windowCovers(loaded, ["2026-07-11"], TODAY)).toBe(true);
  });

  it("requests a new window when the past margin is consumed", () => {
    expect(windowCovers(loaded, ["2026-07-08"], TODAY)).toBe(false);
  });

  it("requests a new window when the future margin is consumed", () => {
    expect(windowCovers(loaded, ["2026-07-12"], TODAY)).toBe(false);
  });

  it("exempts the future margin when the window already touches today", () => {
    const touchingToday = { dateFrom: "2026-07-15", dateTo: TODAY };
    expect(windowCovers(touchingToday, [TODAY], TODAY)).toBe(true);
  });

  it("is false when a visible date is entirely outside", () => {
    expect(windowCovers(loaded, ["2026-07-14"], TODAY)).toBe(false);
  });
});

describe("requestRangeUtc", () => {
  it("covers the local span with UTC dates derived from the day edges", () => {
    const window = { dateFrom: "2026-07-10", dateTo: "2026-07-14" };
    const range = requestRangeUtc(window);

    expect(range.dateFrom).toBe(
      utcDateKeyOfInstant(parseLocalDateKey("2026-07-10")),
    );
    expect(range.dateTo).toBe(utcDateKeyOfInstant(endOfLocalDay("2026-07-14")));
    // The UTC range always covers at least the local range.
    expect(range.dateFrom <= "2026-07-10").toBe(true);
    expect(range.dateTo >= "2026-07-14").toBe(true);
  });
});
