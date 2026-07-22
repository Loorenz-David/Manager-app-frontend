import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { motionValue } from "framer-motion";

import {
  SLIDE_PARALLAX_FRACTION,
  registerSlidePanel,
  useSlideParallaxShift,
} from "./slide-parallax";

const WIDTH = 400;
const PARKED = -SLIDE_PARALLAX_FRACTION * WIDTH; // -100 at 400px

function makeEntry(order: number, x = 0) {
  return {
    order,
    x: motionValue(x),
    getWidth: () => WIDTH,
  };
}

const unregisters: Array<() => void> = [];

function register(entry: ReturnType<typeof makeEntry>) {
  act(() => {
    unregisters.push(registerSlidePanel(entry));
  });
  return entry;
}

afterEach(() => {
  cleanup();
  unregisters.splice(0).forEach((unregister) => unregister());
  vi.restoreAllMocks();
});

describe("useSlideParallaxShift", () => {
  it("is 0 with no slide above", () => {
    const { result } = renderHook(() =>
      useSlideParallaxShift(-1, () => WIDTH),
    );
    expect(result.current.get()).toBe(0);
  });

  it("parks at the parallax fraction under a covering slide and follows its position", () => {
    const above = register(makeEntry(0, 0)); // at rest, fully covering
    const { result } = renderHook(() =>
      useSlideParallaxShift(-1, () => WIDTH),
    );

    expect(result.current.get()).toBe(PARKED);

    // The slide above is dragged halfway off → shift eases back halfway.
    act(() => {
      above.x.set(WIDTH / 2);
    });
    expect(result.current.get()).toBe(PARKED / 2);

    // Fully off-screen → back at rest.
    act(() => {
      above.x.set(WIDTH);
    });
    expect(result.current.get()).toBe(0);
  });

  it("ignores slides at or below its own order", () => {
    register(makeEntry(0, 0));
    const { result } = renderHook(() =>
      // A layer at order 0 (the same slide) must not parallax itself.
      useSlideParallaxShift(0, () => WIDTH),
    );
    expect(result.current.get()).toBe(0);
  });

  it("takes the maximum coverage across an exit/enter overlap", () => {
    // One slide leaving (75% gone) while another enters (25% in).
    register(makeEntry(1, WIDTH * 0.75));
    const entering = register(makeEntry(1, WIDTH * 0.75));
    const { result } = renderHook(() =>
      useSlideParallaxShift(-1, () => WIDTH),
    );
    expect(result.current.get()).toBe(PARKED * 0.25);

    // The entering slide lands → fully parked, exiting one is irrelevant.
    act(() => {
      entering.x.set(0);
    });
    expect(result.current.get()).toBe(PARKED);
  });

  it("returns to rest when the covering slide unregisters after its exit", () => {
    const above = makeEntry(0, WIDTH); // fully slid away
    const unregister = registerSlidePanel(above);
    const { result } = renderHook(() =>
      useSlideParallaxShift(-1, () => WIDTH),
    );
    expect(result.current.get()).toBe(0);

    act(() => {
      unregister();
    });
    expect(result.current.get()).toBe(0);

    // And a later registration re-attaches the subscription.
    const next = register(makeEntry(0, 0));
    expect(result.current.get()).toBe(PARKED);
    act(() => {
      next.x.set(WIDTH);
    });
    expect(result.current.get()).toBe(0);
  });
});
