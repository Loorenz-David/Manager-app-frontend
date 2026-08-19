import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProductionTimeClock } from "./use-production-time-clock";

describe("useProductionTimeClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T10:00:00+00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not schedule a timer when no section is working", () => {
    const intervalSpy = vi.spyOn(window, "setInterval");

    const { result } = renderHook(() => useProductionTimeClock(false));

    expect(result.current).toBe(Date.parse("2026-08-18T10:00:00+00:00"));
    expect(intervalSpy).not.toHaveBeenCalled();
  });

  it("uses one 30-second interval for the whole widget", () => {
    const intervalSpy = vi.spyOn(window, "setInterval");
    const { result } = renderHook(() => useProductionTimeClock(true));

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe(Date.parse("2026-08-18T10:00:30+00:00"));
  });
});
