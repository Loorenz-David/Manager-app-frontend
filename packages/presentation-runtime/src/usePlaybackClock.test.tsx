import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { advancePlaybackTime, usePlaybackClock } from "./usePlaybackClock";

describe("usePlaybackClock", () => {
  let callbacks: FrameRequestCallback[];

  beforeEach(() => {
    callbacks = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  const frame = (timestamp: number) => {
    const callback = callbacks.shift();
    if (!callback) throw new Error("No animation frame was scheduled");
    act(() => callback(timestamp));
  };

  it("plays with fake rAF, clamps long frame deltas to 0.1s, and loops one slide", () => {
    const { result } = renderHook(() => usePlaybackClock({ durationMs: 250 }));
    act(() => result.current.play());
    frame(1_000);
    frame(1_500);
    expect(result.current.timeMs).toBe(100);
    frame(1_600);
    frame(1_700);
    expect(result.current.timeMs).toBe(50);
    expect(result.current.isPlaying).toBe(true);
  });

  it("seeks, pauses, and scrub callers can resume explicitly", () => {
    const { result } = renderHook(() => usePlaybackClock({ durationMs: 4_000 }));
    act(() => {
      result.current.seek(2_500);
      result.current.play();
      result.current.pause();
    });
    expect(result.current.timeMs).toBe(2_500);
    expect(result.current.isPlaying).toBe(false);
  });

  it("stops on the final frame when looping is disabled", () => {
    const { result } = renderHook(() => usePlaybackClock({ durationMs: 50, loop: false }));
    act(() => result.current.play());
    frame(0);
    frame(100);
    expect(result.current.timeMs).toBe(50);
    expect(result.current.isPlaying).toBe(false);
  });
});

describe("advancePlaybackTime", () => {
  it("is deterministic around completion", () => {
    expect(advancePlaybackTime(950, 200, 1_000, false)).toEqual({ timeMs: 1_000, completed: true });
    expect(advancePlaybackTime(950, 200, 1_000, true)).toEqual({ timeMs: 50, completed: false });
  });
});
