import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTimelineVisibleDates } from "./use-timeline-visible-dates";
import { addDaysToKey, todayLocalKey } from "../lib/time-line-calendar/local-date";

const TODAY = todayLocalKey(new Date(2026, 6, 19));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 19, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimelineVisibleDates", () => {
  it("anchors on the parent-provided single date in day mode", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({ initialDate: "2026-07-10" }),
    );

    expect(result.current.focusDate).toBe("2026-07-10");
    expect(result.current.mode).toBe("day");
    expect(result.current.visibleDates).toEqual(["2026-07-10"]);
  });

  it("anchors on the newest date of a parent range in threeDay mode", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({
        initialDateFrom: "2026-07-10",
        initialDateTo: "2026-07-14",
      }),
    );

    expect(result.current.focusDate).toBe("2026-07-14");
    expect(result.current.mode).toBe("threeDay");
    expect(result.current.visibleDates).toEqual([
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
    ]);
  });

  it("clamps a future initial anchor to today", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({ initialDate: addDaysToKey(TODAY, 5) }),
    );

    expect(result.current.focusDate).toBe(TODAY);
    expect(result.current.canGoNext).toBe(false);
  });

  it("defaults to today in day mode with no parent anchor", () => {
    const { result } = renderHook(() => useTimelineVisibleDates({}));

    expect(result.current.focusDate).toBe(TODAY);
    expect(result.current.mode).toBe("day");
  });

  it("navigates by one day in day mode and clamps at today", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({ initialDate: addDaysToKey(TODAY, -1) }),
    );

    act(() => result.current.goNext());
    expect(result.current.focusDate).toBe(TODAY);
    expect(result.current.canGoNext).toBe(false);

    act(() => result.current.goNext());
    expect(result.current.focusDate).toBe(TODAY);

    act(() => result.current.goPrev());
    expect(result.current.focusDate).toBe(addDaysToKey(TODAY, -1));
  });

  it("navigates by three days in threeDay mode", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({
        initialDateFrom: addDaysToKey(TODAY, -10),
        initialDateTo: addDaysToKey(TODAY, -8),
      }),
    );

    act(() => result.current.goPrev());
    expect(result.current.focusDate).toBe(addDaysToKey(TODAY, -11));

    act(() => result.current.goNext());
    expect(result.current.focusDate).toBe(addDaysToKey(TODAY, -8));
  });

  it("selects a picker date as the newest visible date and switches mode", () => {
    const { result } = renderHook(() => useTimelineVisibleDates({}));

    act(() => result.current.selectDate("2026-07-10", "threeDay"));
    expect(result.current.visibleDates).toEqual([
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
    ]);
  });

  it("preserves the focused date across mode switches", () => {
    const { result } = renderHook(() =>
      useTimelineVisibleDates({ initialDate: "2026-07-10" }),
    );

    act(() => result.current.setMode("threeDay"));
    expect(result.current.focusDate).toBe("2026-07-10");
    expect(result.current.visibleDates).toHaveLength(3);

    act(() => result.current.setMode("day"));
    expect(result.current.visibleDates).toEqual(["2026-07-10"]);
  });
});
