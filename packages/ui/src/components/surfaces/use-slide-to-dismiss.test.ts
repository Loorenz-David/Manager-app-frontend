import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMotionValue } from "framer-motion";

import { useSlideToDismiss } from "./use-slide-to-dismiss";

// The hook binds raw touch listeners to the panel element, so the tests drive
// it with synthetic touch events on a real (jsdom) node. jsdom has no
// TouchEvent constructor; a plain Event with a `touches` list is sufficient
// since the hook reads only `touches[i].clientX/clientY` and `touches.length`.
function touchEvent(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  points: Array<{ x: number; y: number }>,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: points.map((point) => ({ clientX: point.x, clientY: point.y })),
  });
  return event;
}

const PANEL_WIDTH = 400;

let panel: HTMLDivElement;
let now = 0;

function setup(opts?: { onDismiss?: () => boolean; enabled?: boolean }) {
  const onDismiss = opts?.onDismiss ?? vi.fn(() => true);
  // The surface owns the panel MotionValue and passes it in; the hook writes
  // it. The test returns it so assertions can read the driven position.
  const rendered = renderHook(() => {
    const x = useMotionValue(0);
    useSlideToDismiss({
      enabled: opts?.enabled ?? true,
      panelRef: { current: panel },
      x,
      onDismiss,
    });
    return { x };
  });
  return { ...rendered, onDismiss };
}

function dispatch(event: Event) {
  act(() => {
    panel.dispatchEvent(event);
  });
}

/** touchstart at (x, y). */
function start(x: number, y: number) {
  dispatch(touchEvent("touchstart", [{ x, y }]));
}

/** touchstart whose target is a specific descendant (for region opt-out). */
function startOn(targetEl: HTMLElement, x: number, y: number) {
  const event = touchEvent("touchstart", [{ x, y }]);
  act(() => {
    targetEl.dispatchEvent(event); // bubbles up to the panel listener
  });
}

/** touchmove to (x, y) at the given clock time (ms); returns the event. */
function move(x: number, y: number, atMs: number): Event {
  now = atMs;
  const event = touchEvent("touchmove", [{ x, y }]);
  dispatch(event);
  return event;
}

function end() {
  dispatch(touchEvent("touchend", []));
}

beforeEach(() => {
  panel = document.createElement("div");
  Object.defineProperty(panel, "offsetWidth", {
    configurable: true,
    value: PANEL_WIDTH,
  });
  document.body.appendChild(panel);
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  cleanup();
  panel.remove();
  vi.restoreAllMocks();
});

describe("useSlideToDismiss", () => {
  it("follows the finger once the drag locks horizontal, claiming the touch", () => {
    const { result } = setup();

    start(100, 100);
    const lockingMove = move(160, 104, 50);

    expect(result.current.x.get()).toBe(60);
    // Once locked, the hook must preventDefault so the browser can't take over.
    expect(lockingMove.defaultPrevented).toBe(true);
  });

  it("leaves vertical-dominant touches to native scrolling", () => {
    const { result, onDismiss } = setup();

    start(100, 100);
    const verticalMove = move(104, 220, 50);
    // A later horizontal move must not revive the rejected gesture.
    move(300, 220, 100);
    end();

    expect(result.current.x.get()).toBe(0);
    expect(verticalMove.defaultPrevented).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not move the panel or claim the touch below the lock distance (taps stay taps)", () => {
    const { result, onDismiss } = setup();

    start(100, 100);
    const tinyMove = move(104, 101, 30);
    end();

    expect(result.current.x.get()).toBe(0);
    expect(tinyMove.defaultPrevented).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("clamps leftward drags to the open position", () => {
    const { result } = setup();

    start(200, 100);
    move(150, 102, 50); // locks horizontal (|dx|=50)
    move(120, 102, 100); // further left of the start

    expect(result.current.x.get()).toBe(0);
  });

  it("dismisses only on release once past the distance threshold", () => {
    const { onDismiss } = setup();

    start(50, 100);
    // 250px = 62% of the 400px panel — past 45%, but slow (no fling).
    move(150, 102, 1000);
    move(300, 104, 2000);
    expect(onDismiss).not.toHaveBeenCalled(); // finger still down

    end();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("dismisses on a fast rightward fling below the distance threshold", () => {
    const { onDismiss } = setup();

    start(100, 100);
    move(140, 102, 20); // 40px in 20ms → 2 px/ms
    end();

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("springs back without dismissing on a slow short drag", () => {
    const { result, onDismiss } = setup();

    start(100, 100);
    move(180, 102, 1000); // 80px < 45% of 400, 0.08 px/ms
    end();

    expect(onDismiss).not.toHaveBeenCalled();
    // Spring-back animation is in flight; it must be heading to rest, and the
    // offset can only shrink from here.
    expect(result.current.x.get()).toBeLessThanOrEqual(80);
  });

  it("never dismisses when the system cancels the touch", () => {
    const { onDismiss } = setup();

    start(50, 100);
    move(300, 104, 50); // well past the distance threshold
    dispatch(touchEvent("touchcancel", []));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("springs back when the close is intercepted (dirty-form guard)", () => {
    const onDismiss = vi.fn(() => false);
    setup({ onDismiss });

    start(50, 100);
    move(300, 104, 50);
    end();

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not listen at all when disabled", () => {
    const { result, onDismiss } = setup({ enabled: false });

    start(50, 100);
    move(300, 104, 50);
    end();

    expect(result.current.x.get()).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("ignores a drag that begins inside a data-slide-dismiss-ignore region", () => {
    const { result, onDismiss } = setup();
    const region = document.createElement("div");
    region.setAttribute("data-slide-dismiss-ignore", "");
    const inner = document.createElement("button");
    region.appendChild(inner);
    panel.appendChild(region);

    startOn(inner, 50, 100);
    const horizontalMove = move(300, 104, 50); // well past threshold
    end();

    expect(result.current.x.get()).toBe(0);
    expect(onDismiss).not.toHaveBeenCalled();
    // The region keeps its own gesture: we never claimed the touch.
    expect(horizontalMove.defaultPrevented).toBe(false);
  });

  it("cancels a child's in-progress gesture when the drag takes over the touch", () => {
    setup();
    const child = document.createElement("button");
    panel.appendChild(child);
    const onPointerCancel = vi.fn();
    child.addEventListener("pointercancel", onPointerCancel);

    startOn(child, 100, 100);
    expect(onPointerCancel).not.toHaveBeenCalled(); // finger down, not yet a drag

    move(120, 102, 40); // locks horizontal → dismiss drag takes over
    expect(onPointerCancel).toHaveBeenCalledOnce();
  });

  it("does not cancel child gestures for a mere tap or a vertical scroll", () => {
    setup();
    const child = document.createElement("button");
    panel.appendChild(child);
    const onPointerCancel = vi.fn();
    child.addEventListener("pointercancel", onPointerCancel);

    // Tap: down then up with no lock.
    startOn(child, 100, 100);
    end();
    // Vertical scroll: down then vertical-dominant move.
    startOn(child, 100, 100);
    move(102, 200, 40);
    end();

    expect(onPointerCancel).not.toHaveBeenCalled();
  });

  it("still dismisses for drags outside the opted-out region", () => {
    const { onDismiss } = setup();
    const region = document.createElement("div");
    region.setAttribute("data-slide-dismiss-ignore", "");
    panel.appendChild(region);

    start(50, 100); // target is the panel, not the region
    move(300, 104, 50);
    end();

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
