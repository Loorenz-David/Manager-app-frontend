import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrollProgressCssVar } from "./use-scroll-progress-css-var";

describe("useScrollProgressCssVar", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("coalesces progress updates and writes the latest value on the next frame", () => {
    let frame: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const container = document.createElement("div");
    const containerRef = { current: container };
    const progressRef = { current: 0 };

    const { result } = renderHook(() =>
      useScrollProgressCssVar({
        containerRef,
        progressRef,
        getSnapDirection: () => 1,
        onSnapComplete: vi.fn(),
        suspend: vi.fn(),
      }),
    );

    act(() => {
      progressRef.current = 0.25;
      result.current.onProgress(progressRef.current);
      progressRef.current = 0.75;
      result.current.onProgress(progressRef.current);
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      if (!frame) {
        throw new Error("Expected a pending animation frame");
      }
      frame(16);
    });

    expect(container.style.getPropertyValue("--scroll-hide-progress")).toBe(
      "0.75",
    );
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("smoothly snaps from the last painted value when a fast swipe reaches an endpoint before the next frame", () => {
    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    });
    const cancelAnimationFrame = vi.fn((frameId: number) => {
      frames.delete(frameId);
    });

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const runFrame = (frameId: number) => {
      const callback = frames.get(frameId);
      if (!callback) {
        throw new Error(`Expected animation frame ${frameId}`);
      }
      frames.delete(frameId);
      callback(16);
    };

    const container = document.createElement("div");
    const containerRef = { current: container };
    const progressRef = { current: 0 };

    const { result } = renderHook(() =>
      useScrollProgressCssVar({
        containerRef,
        progressRef,
        getSnapDirection: () => 0,
        onSnapComplete: vi.fn(),
        suspend: vi.fn(),
      }),
    );

    act(() => {
      progressRef.current = 1;
      result.current.onProgress(progressRef.current);
      runFrame(1);
      result.current.onTouchStart();
    });

    expect(container.style.getPropertyValue("--scroll-hide-progress")).toBe(
      "1",
    );

    act(() => {
      progressRef.current = 0;
      result.current.onProgress(progressRef.current);
      result.current.onTouchEnd();
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(container.style.getPropertyValue("--scroll-snap-duration")).toBe(
      "400ms",
    );
    expect(container.style.getPropertyValue("--scroll-hide-progress")).toBe(
      "1",
    );

    act(() => {
      runFrame(3);
    });

    expect(container.style.getPropertyValue("--scroll-hide-progress")).toBe(
      "0",
    );
  });

  it("handles only one touchend when the element event bubbles to document", () => {
    let frame: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const container = document.createElement("div");
    const containerRef = { current: container };
    const progressRef = { current: 0 };
    let direction: 0 | 1 = 1;
    const onSnapComplete = vi.fn(() => {
      direction = 0;
    });

    const { result } = renderHook(() =>
      useScrollProgressCssVar({
        containerRef,
        progressRef,
        getSnapDirection: () => direction,
        onSnapComplete,
        suspend: vi.fn(),
      }),
    );

    act(() => {
      progressRef.current = 1;
      result.current.onProgress(progressRef.current);
      if (!frame) {
        throw new Error("Expected a pending animation frame");
      }
      frame(16);
      result.current.onTouchStart();
      result.current.onTouchEnd();
      result.current.onTouchEnd();
    });

    expect(onSnapComplete).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(container.style.getPropertyValue("--scroll-hide-progress")).toBe(
      "1",
    );
  });

  it("retargets an in-flight footer hide when momentum reaches the reveal edge", () => {
    vi.useFakeTimers();

    let nextFrameId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        nextFrameId += 1;
        frames.set(nextFrameId, callback);
        return nextFrameId;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const runFrame = (frameId: number) => {
      const callback = frames.get(frameId);
      if (!callback) {
        throw new Error(`Expected animation frame ${frameId}`);
      }
      frames.delete(frameId);
      callback(16);
    };

    const container = document.createElement("div");
    const containerRef = { current: container };
    const progressRef = { current: 0 };
    const footerProgressRef = { current: 0 };
    const onSnapComplete = vi.fn();

    const { result } = renderHook(() =>
      useScrollProgressCssVar({
        containerRef,
        progressRef,
        footerProgressRef,
        getSnapDirection: () => 1,
        getFooterSnapDirection: () => 1,
        onSnapComplete,
        suspend: vi.fn(),
      }),
    );

    act(() => {
      result.current.onTouchStart();
      progressRef.current = 0.5;
      footerProgressRef.current = 0.5;
      result.current.onProgress(progressRef.current);
      runFrame(1);
      result.current.onTouchEnd();
      runFrame(2);
    });

    expect(
      container.style.getPropertyValue("--scroll-hide-progress-footer"),
    ).toBe("1");

    act(() => {
      footerProgressRef.current = 0;
      result.current.onProgress(progressRef.current);
    });

    expect(
      container.style.getPropertyValue("--scroll-hide-progress-footer"),
    ).toBe("0");
    expect(
      container.style.getPropertyValue("--scroll-snap-duration-footer"),
    ).toBe("160ms");

    act(() => {
      vi.advanceTimersByTime(421);
    });

    expect(onSnapComplete).toHaveBeenCalledWith(1, 0);
  });
});
