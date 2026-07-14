import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScrollState } from "./use-scroll-state";

type HookOptions = Parameters<typeof useScrollState>[0];

function buildOptions(
  overrides: Partial<HookOptions> = {},
): HookOptions {
  return {
    threshold: 40,
    topOffset: 0,
    hideThreshold: 40,
    showThreshold: 24,
    hysteresis: 8,
    mode: "relative",
    ...overrides,
  };
}

describe("useScrollState", () => {
  it("locks the footer channel visible near the configured bottom edge without changing the core hidden state", () => {
    const { result } = renderHook(() =>
      useScrollState(
        buildOptions({
          revealAtEdge: "bottom",
          edgeOffset: 24,
        }),
      ),
    );

    act(() => {
      result.current.initialize(0);
      result.current.suspend(0);
      result.current.onScroll(1, {
        distanceFromStart: 1,
        distanceFromEnd: 120,
      });
      result.current.onScroll(41, {
        distanceFromStart: 41,
        distanceFromEnd: 80,
      });
    });

    expect(result.current.isHidden).toBe(true);

    act(() => {
      result.current.onScroll(120, {
        distanceFromStart: 120,
        distanceFromEnd: 20,
      });
    });

    expect(result.current.isHidden).toBe(true);
    expect(result.current.isAtEdge).toBe(true);
    expect(result.current.progressRef.current).toBe(1);
    expect(result.current.footerProgressRef.current).toBe(0);
  });

  it("keeps onScroll stable when edgeOffset changes", () => {
    const { result, rerender } = renderHook(
      ({ edgeOffset }) =>
        useScrollState(
          buildOptions({
            revealAtEdge: "bottom",
            edgeOffset,
          }),
        ),
      {
        initialProps: { edgeOffset: 48 },
      },
    );

    const initialOnScroll = result.current.onScroll;

    act(() => {
      result.current.initialize(0);
      result.current.suspend(0);
      result.current.onScroll(1, {
        distanceFromStart: 1,
        distanceFromEnd: 120,
      });
      result.current.onScroll(41, {
        distanceFromStart: 41,
        distanceFromEnd: 79,
      });
    });

    expect(result.current.isHidden).toBe(true);

    rerender({ edgeOffset: 12 });

    expect(result.current.onScroll).toBe(initialOnScroll);
    expect(result.current.isHidden).toBe(true);
    expect(result.current.footerProgressRef.current).toBe(1);
  });

  it("keeps the footer channel visible when leaving the edge zone upward and only rehides after a fresh threshold", () => {
    const { result } = renderHook(() =>
      useScrollState(
        buildOptions({
          revealAtEdge: "bottom",
          edgeOffset: 20,
        }),
      ),
    );

    act(() => {
      result.current.initialize(0);
      result.current.suspend(0);
      result.current.onScroll(1, {
        distanceFromStart: 1,
        distanceFromEnd: 200,
      });
      result.current.onScroll(41, {
        distanceFromStart: 41,
        distanceFromEnd: 160,
      });
      result.current.onScroll(120, {
        distanceFromStart: 120,
        distanceFromEnd: 20,
      });
      result.current.onScroll(99, {
        distanceFromStart: 99,
        distanceFromEnd: 21,
      });
    });

    expect(result.current.isHidden).toBe(true);
    expect(result.current.isAtEdge).toBe(false);
    expect(result.current.progressRef.current).toBe(1);
    expect(result.current.footerProgressRef.current).toBe(0);

    act(() => {
      result.current.onScroll(70, {
        distanceFromStart: 70,
        distanceFromEnd: 50,
      });
      result.current.onScroll(71, {
        distanceFromStart: 71,
        distanceFromEnd: 49,
      });
    });

    expect(result.current.isHidden).toBe(false);
    expect(result.current.isAtEdge).toBe(false);
    expect(result.current.footerProgressRef.current).toBe(0);

    act(() => {
      result.current.onScroll(110, {
        distanceFromStart: 110,
        distanceFromEnd: 30,
      });
    });

    expect(result.current.isAtEdge).toBe(false);
    expect(result.current.isHidden).toBe(false);
    expect(result.current.footerProgressRef.current).toBe(0.975);

    act(() => {
      result.current.onScroll(111, {
        distanceFromStart: 111,
        distanceFromEnd: 29,
      });
    });

    expect(result.current.isHidden).toBe(true);
    expect(result.current.progressRef.current).toBe(1);
    expect(result.current.footerProgressRef.current).toBe(1);
  });

  it("preserves plain relative-mode behavior when revealAtEdge is omitted", () => {
    const { result } = renderHook(() => useScrollState(buildOptions()));

    act(() => {
      result.current.initialize(0);
      result.current.suspend(0);
      result.current.onScroll(1, {
        distanceFromStart: 1,
        distanceFromEnd: 0,
      });
      result.current.onScroll(41, {
        distanceFromStart: 41,
        distanceFromEnd: 0,
      });
    });

    expect(result.current.isHidden).toBe(true);
    expect(result.current.progressRef.current).toBe(1);
    expect(result.current.footerProgressRef.current).toBe(1);
    expect(result.current.isAtEdge).toBe(false);
  });

  it("applies the footer edge override while directional updates are suppressed", () => {
    const { result } = renderHook(() =>
      useScrollState(
        buildOptions({
          revealAtEdge: "bottom",
          edgeOffset: 20,
        }),
      ),
    );

    act(() => {
      result.current.initialize(0);
      result.current.suspend(0);
      result.current.onScroll(1, {
        distanceFromStart: 1,
        distanceFromEnd: 100,
      });
      result.current.onScroll(41, {
        distanceFromStart: 41,
        distanceFromEnd: 60,
      });
      result.current.suspend(500);
      result.current.onScroll(100, {
        distanceFromStart: 100,
        distanceFromEnd: 10,
      });
    });

    expect(result.current.isHidden).toBe(true);
    expect(result.current.isAtEdge).toBe(true);
    expect(result.current.footerProgressRef.current).toBe(0);
  });
});
