import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";

import { SurfaceHeaderContext, type SurfaceHeaderValue } from "../../../providers/SurfaceProvider";
import { SlidePageSurface } from "../../surfaces/SlidePageSurface";
import { SlideStack, SlideStackPane } from ".";

// The apps load LazyMotion with domAnimation at their root; `m` components
// only animate (incl. exit) with those features present, so the test must
// mirror that setup.
function Stack({
  activeId,
  direction,
}: {
  activeId: string;
  direction?: 1 | -1;
}): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <SlideStack activeId={activeId} direction={direction}>
          <SlideStackPane id="one">
            <div data-testid="content-one" />
          </SlideStackPane>
          <SlideStackPane id="two">
            <div data-testid="content-two" />
          </SlideStackPane>
          <SlideStackPane id="three">
            <div data-testid="content-three" />
          </SlideStackPane>
        </SlideStack>
      </div>
    </LazyMotion>
  );
}

afterEach(cleanup);

describe("SlideStack", () => {
  it("renders only the active pane at rest", () => {
    render(<Stack activeId="one" />);

    expect(screen.getByTestId("slide-stack-pane-one")).toBeDefined();
    expect(screen.queryByTestId("slide-stack-pane-two")).toBeNull();
  });

  it("overlaps both panes during a transition, then unmounts the outgoing one", async () => {
    const { rerender } = render(<Stack activeId="one" />);

    rerender(<Stack activeId="two" />);

    // Transition in progress: the outgoing pane stays mounted beneath the
    // incoming one (this is the stacked-card overlap).
    expect(screen.queryByTestId("slide-stack-pane-one")).not.toBeNull();
    expect(screen.getByTestId("slide-stack-pane-two")).toBeDefined();

    await waitFor(
      () => expect(screen.queryByTestId("slide-stack-pane-one")).toBeNull(),
      { timeout: 3000 },
    );
    expect(screen.getByTestId("slide-stack-pane-two")).toBeDefined();
  });

  it("navigates backward to an earlier pane without a controlled direction", async () => {
    const { rerender } = render(<Stack activeId="three" />);

    rerender(<Stack activeId="one" />);

    expect(screen.getByTestId("slide-stack-pane-one")).toBeDefined();
    await waitFor(
      () => expect(screen.queryByTestId("slide-stack-pane-three")).toBeNull(),
      { timeout: 3000 },
    );
  });

  it("does not animate the initial pane by default", () => {
    render(<Stack activeId="one" />);

    // With animateInitial=false the pane mounts settled at its resting
    // state rather than starting from the enter offset.
    const pane = screen.getByTestId("slide-stack-pane-one");
    expect(pane.style.opacity === "" || pane.style.opacity === "1").toBe(true);
  });
});

function makeSurface(): SurfaceHeaderValue {
  return {
    setTitle: vi.fn(),
    setActions: vi.fn(),
    requestClose: vi.fn(),
    setHeaderHidden: vi.fn(),
    setCloseInterceptor: vi.fn(),
    setSwipeDismissDisabled: vi.fn(),
    setBackdropHidden: vi.fn(),
  };
}

function SurfaceStack({
  activeId,
  surface,
  onBack,
  onForward,
  onCommit,
  canBack,
  canForward,
}: {
  activeId: string;
  surface: SurfaceHeaderValue;
  onBack?: () => void;
  onForward?: () => void;
  onCommit?: (type: "back" | "forward") => void;
  canBack?: boolean | (() => boolean);
  canForward?: boolean | (() => boolean);
}): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation}>
      <SurfaceHeaderContext.Provider value={surface}>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <SlideStack
            activeId={activeId}
            canBack={canBack}
            canForward={canForward}
            onBack={onBack}
            onForward={onForward}
            onCommit={onCommit}
          >
            <SlideStackPane id="one">
              <div />
            </SlideStackPane>
            <SlideStackPane id="two">
              <div />
            </SlideStackPane>
          </SlideStack>
        </div>
      </SurfaceHeaderContext.Provider>
    </LazyMotion>
  );
}

describe("SlideStack surface close interception", () => {
  it("leaves the surface close untouched while on the first pane", () => {
    const surface = makeSurface();
    render(<SurfaceStack activeId="one" surface={surface} onBack={() => {}} />);

    expect(surface.setCloseInterceptor).not.toHaveBeenCalled();
    expect(surface.setSwipeDismissDisabled).not.toHaveBeenCalled();
  });

  it("mutes the surface swipe and intercepts close beyond the first pane", () => {
    const surface = makeSurface();
    const onBack = vi.fn();
    const { rerender } = render(
      <SurfaceStack activeId="one" surface={surface} onBack={onBack} />,
    );

    rerender(<SurfaceStack activeId="two" surface={surface} onBack={onBack} />);

    expect(surface.setSwipeDismissDisabled).toHaveBeenLastCalledWith(true);

    const setInterceptor = vi.mocked(surface.setCloseInterceptor);
    const interceptor = setInterceptor.mock.lastCall?.[0];
    expect(typeof interceptor).toBe("function");

    interceptor?.();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("registers against a real SlidePageSurface without an update loop", () => {
    // Regression: registering the interceptor re-renders the surface; if the
    // surface's context value or the stack's effect keying is identity-
    // unstable, the pair loops until React throws max-update-depth.
    render(
      <LazyMotion features={domAnimation}>
        <SlidePageSurface onClose={() => {}} zIndex={10} isTopmost>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <SlideStack activeId="two" onBack={() => {}}>
              <SlideStackPane id="one">
                <div />
              </SlideStackPane>
              <SlideStackPane id="two">
                <div />
              </SlideStackPane>
            </SlideStack>
          </div>
        </SlidePageSurface>
      </LazyMotion>,
    );

    expect(screen.getByTestId("slide-stack-pane-two")).toBeDefined();
  });

  it("restores the surface swipe and interceptor at the first pane", () => {
    const surface = makeSurface();
    const { rerender } = render(
      <SurfaceStack activeId="two" surface={surface} onBack={() => {}} />,
    );
    expect(
      vi.mocked(surface.setCloseInterceptor).mock.lastCall?.[0],
    ).toBeTypeOf("function");
    expect(surface.setSwipeDismissDisabled).toHaveBeenLastCalledWith(true);

    rerender(<SurfaceStack activeId="one" surface={surface} onBack={() => {}} />);

    expect(vi.mocked(surface.setCloseInterceptor).mock.lastCall?.[0]).toBeNull();
    expect(surface.setSwipeDismissDisabled).toHaveBeenLastCalledWith(false);
  });

  it("releases the surface controls when back navigation becomes unavailable", () => {
    const surface = makeSurface();
    const onBack = vi.fn();
    const { rerender } = render(
      <SurfaceStack activeId="two" surface={surface} onBack={onBack} />,
    );

    expect(
      vi.mocked(surface.setCloseInterceptor).mock.lastCall?.[0],
    ).toBeTypeOf("function");
    expect(surface.setSwipeDismissDisabled).toHaveBeenLastCalledWith(true);

    rerender(
      <SurfaceStack activeId="two" surface={surface} onBack={undefined} />,
    );

    expect(vi.mocked(surface.setCloseInterceptor).mock.lastCall?.[0]).toBeNull();
    expect(surface.setSwipeDismissDisabled).toHaveBeenLastCalledWith(false);
  });

  it("lets the real surface close gesture own a deep-pane swipe when onBack is absent", async () => {
    const onClose = vi.fn();
    render(
      <LazyMotion features={domAnimation}>
        <SlidePageSurface onClose={onClose} zIndex={10} isTopmost>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <SlideStack activeId="two">
              <SlideStackPane id="one">
                <div />
              </SlideStackPane>
              <SlideStackPane id="two">
                <div />
              </SlideStackPane>
            </SlideStack>
          </div>
        </SlidePageSurface>
      </LazyMotion>,
    );

    // Let the surface's entrance settle so the gesture starts from x=0.
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });

    const pane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(pane, "touchstart", 10, 100);
    dispatchTouch(pane, "touchmove", 10 + commitTravel(), 104);

    expect(screen.queryByTestId("slide-stack-pane-one-ghost")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    dispatchTouch(pane, "touchend", 10 + commitTravel(), 104);

    expect(onClose).toHaveBeenCalledOnce();
  });
});

function dispatchTouch(
  element: Element,
  type: "touchstart" | "touchmove" | "touchend",
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [{ clientX: x, clientY: y }],
  });
  act(() => {
    element.dispatchEvent(event);
  });
}

// jsdom panes have offsetWidth 0, so the drag hook measures against
// window.innerWidth; travel far enough past the 45% commit threshold.
function commitTravel(): number {
  return Math.round(window.innerWidth * 0.6);
}

describe("SlideStack interactive drag", () => {
  it("back drag mounts the previous pane as under-ghost and commits to onBack", async () => {
    const onBack = vi.fn();
    render(
      <SurfaceStack activeId="two" surface={makeSurface()} onBack={onBack} />,
    );

    const pane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(pane, "touchstart", 10, 100);
    dispatchTouch(pane, "touchmove", 10 + commitTravel() / 2, 104);

    // Mid-drag: the previous pane is standing in beneath the dragged one.
    expect(screen.getByTestId("slide-stack-pane-one-ghost")).toBeDefined();
    expect(onBack).not.toHaveBeenCalled();

    dispatchTouch(pane, "touchmove", 10 + commitTravel(), 106);
    dispatchTouch(pane, "touchend", 10 + commitTravel(), 106);

    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
  });

  it("forward drag mounts the next pane as over-ghost and commits to onForward", async () => {
    const onForward = vi.fn();
    render(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={() => {}}
        onForward={onForward}
      />,
    );

    const pane = screen.getByTestId("slide-stack-pane-one");
    const startX = 10 + commitTravel();
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel() / 2, 104);

    expect(screen.getByTestId("slide-stack-pane-two-ghost")).toBeDefined();
    expect(onForward).not.toHaveBeenCalled();

    dispatchTouch(pane, "touchmove", startX - commitTravel(), 106);
    dispatchTouch(pane, "touchend", startX - commitTravel(), 106);

    await waitFor(() => expect(onForward).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
  });

  it("signals the commit at the release, one settle before it navigates", async () => {
    const order: string[] = [];
    const onForward = vi.fn(() => order.push("navigate"));
    const onCommit = vi.fn((type: "back" | "forward") =>
      order.push(`commit:${type}`),
    );
    render(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={() => {}}
        onForward={onForward}
        onCommit={onCommit}
      />,
    );

    const pane = screen.getByTestId("slide-stack-pane-one");
    const startX = 10 + commitTravel();
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel(), 104);
    dispatchTouch(pane, "touchend", startX - commitTravel(), 104);

    // Released: chrome already knows, while the ghost is still travelling.
    expect(onCommit).toHaveBeenCalledWith("forward");
    expect(onForward).not.toHaveBeenCalled();

    await waitFor(() => expect(onForward).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(order).toEqual(["commit:forward", "navigate"]);
  });

  it("springs back without navigating when released below the threshold", async () => {
    const onBack = vi.fn();
    const onCommit = vi.fn();
    render(
      <SurfaceStack
        activeId="two"
        surface={makeSurface()}
        onBack={onBack}
        onCommit={onCommit}
      />,
    );

    const pane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(pane, "touchstart", 10, 100);
    // Slow, short travel: below distance and velocity thresholds.
    const shortTravel = Math.round(window.innerWidth * 0.15);
    dispatchTouch(pane, "touchmove", 10 + shortTravel / 2, 104);
    await new Promise((resolve) => setTimeout(resolve, 50));
    dispatchTouch(pane, "touchmove", 10 + shortTravel, 106);
    // Hold still before lifting so the release velocity is ~0 (no fling).
    await new Promise((resolve) => setTimeout(resolve, 80));
    dispatchTouch(pane, "touchmove", 10 + shortTravel, 106);
    dispatchTouch(pane, "touchend", 10 + shortTravel, 106);

    // The ghost settles away and no navigation happens.
    await waitFor(
      () =>
        expect(screen.queryByTestId("slide-stack-pane-one-ghost")).toBeNull(),
      { timeout: 3000 },
    );
    expect(onBack).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not engage a drag whose condition resolves false", async () => {
    const onForward = vi.fn();
    const onBack = vi.fn();
    const canForward = vi.fn(() => false);
    const { rerender } = render(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={onBack}
        onForward={onForward}
        canForward={canForward}
      />,
    );

    // Condition false: the leftward drag never engages — no ghost, no call.
    const pane = screen.getByTestId("slide-stack-pane-one");
    const startX = 20 + commitTravel();
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel(), 104);
    expect(canForward).toHaveBeenCalled();
    expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull();
    dispatchTouch(pane, "touchend", startX - commitTravel(), 104);
    expect(onForward).not.toHaveBeenCalled();

    // Same gesture once the condition flips: engages normally.
    rerender(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={onBack}
        onForward={onForward}
        canForward={() => true}
      />,
    );
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel(), 104);
    expect(screen.getByTestId("slide-stack-pane-two-ghost")).toBeDefined();
    dispatchTouch(pane, "touchend", startX - commitTravel(), 104);
    // Let the committed drag fully settle (ghost removed) before the next
    // section, so its begin() isn't refused for the wrong reason.
    await waitFor(
      () =>
        expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull(),
      { timeout: 3000 },
    );

    // Boolean form gates the back drag the same way.
    const surface = makeSurface();
    rerender(
      <SurfaceStack
        activeId="two"
        surface={surface}
        onBack={onBack}
        canBack={false}
      />,
    );
    const deepPane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(deepPane, "touchstart", 20, 100);
    dispatchTouch(deepPane, "touchmove", 20 + commitTravel(), 104);
    expect(screen.queryByTestId("slide-stack-pane-one-ghost")).toBeNull();
    dispatchTouch(deepPane, "touchend", 20 + commitTravel(), 104);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("waits out an async condition without animating, engaging only on true", async () => {
    const onForward = vi.fn();
    const onBack = vi.fn();
    const { rerender } = render(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={onBack}
        onForward={onForward}
        canForward={() => Promise.resolve(false)}
      />,
    );

    const pane = screen.getByTestId("slide-stack-pane-one");
    const startX = 20 + commitTravel();
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel(), 104);
    // Condition still resolving: nothing engages, nothing animates.
    expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull();
    await act(async () => {});
    // Resolved false: still inert, and release does not navigate.
    expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull();
    dispatchTouch(pane, "touchend", startX - commitTravel(), 104);
    expect(onForward).not.toHaveBeenCalled();

    rerender(
      <SurfaceStack
        activeId="one"
        surface={makeSurface()}
        onBack={onBack}
        onForward={onForward}
        canForward={() => Promise.resolve(true)}
      />,
    );
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - commitTravel() / 2, 104);
    expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull();
    await act(async () => {});
    // Resolved true mid-gesture: engages and catches up to the finger.
    expect(screen.getByTestId("slide-stack-pane-two-ghost")).toBeDefined();
    dispatchTouch(pane, "touchmove", startX - commitTravel(), 106);
    dispatchTouch(pane, "touchend", startX - commitTravel(), 106);
    await waitFor(() => expect(onForward).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
  });

  it("ignores vertical touches, back on the first pane, and forward without onForward", () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <SurfaceStack activeId="two" surface={makeSurface()} onBack={onBack} />,
    );

    // Vertical-dominant: native scrolling owns the touch.
    const deepPane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(deepPane, "touchstart", 10, 100);
    dispatchTouch(deepPane, "touchmove", 30, 400);
    dispatchTouch(deepPane, "touchend", 30, 400);
    expect(onBack).not.toHaveBeenCalled();

    // Forward on the last pane / without onForward: no ghost engages.
    dispatchTouch(deepPane, "touchstart", 500, 100);
    dispatchTouch(deepPane, "touchmove", 500 - commitTravel(), 104);
    expect(screen.queryByTestId("slide-stack-pane-one-ghost")).toBeNull();
    dispatchTouch(deepPane, "touchend", 500 - commitTravel(), 104);

    // Back on the first pane: falls through to the surface (no ghost).
    rerender(
      <SurfaceStack activeId="one" surface={makeSurface()} onBack={onBack} />,
    );
    const firstPane = screen.getByTestId("slide-stack-pane-one");
    dispatchTouch(firstPane, "touchstart", 10, 100);
    dispatchTouch(firstPane, "touchmove", 10 + commitTravel(), 104);
    expect(screen.queryByTestId("slide-stack-pane-two-ghost")).toBeNull();
    dispatchTouch(firstPane, "touchend", 10 + commitTravel(), 104);
    expect(onBack).not.toHaveBeenCalled();
  });
});
