import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useKioskClock } from "@/hooks/use-kiosk-clock";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-29T13:14:30.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useKioskClock", () => {
  it("formats the workspace time zone and ticks every second", () => {
    const { result } = renderHook(() => useKioskClock("Europe/Stockholm"));

    expect(result.current).toEqual({
      time: "15:14",
      date: "Wednesday 29 July",
    });

    act(() => {
      vi.advanceTimersByTime(31_000);
    });

    expect(result.current.time).toBe("15:15");
  });
});
