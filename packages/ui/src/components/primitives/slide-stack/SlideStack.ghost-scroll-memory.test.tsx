import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";

import { SlideStack, SlideStackPane } from ".";

function dispatchTouch(
  element: Element,
  type: "touchstart" | "touchmove",
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: [{ clientX: x, clientY: y, identifier: 1 }],
  });
  act(() => {
    element.dispatchEvent(event);
  });
}

function renderStack(
  paneScrollMemory?: (paneId: string) => number,
): void {
  render(
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <SlideStack
          activeId="two"
          onBack={vi.fn()}
          paneScrollMemory={paneScrollMemory}
        >
          <SlideStackPane id="one">
            <div data-testid="content-one" />
          </SlideStackPane>
          <SlideStackPane id="two">
            <div data-testid="content-two" />
          </SlideStackPane>
        </SlideStack>
      </div>
    </LazyMotion>,
  );
}

function dragBackFrom(paneId: string): void {
  const pane = screen.getByTestId(`slide-stack-pane-${paneId}`);
  dispatchTouch(pane, "touchstart", 20, 100);
  dispatchTouch(pane, "touchmove", 120, 104);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SlideStack ghost scroll memory", () => {
  it("pre-scrolls the ghost to the pane's remembered position", () => {
    renderStack((paneId) => (paneId === "one" ? 480 : 0));

    dragBackFrom("two");

    // The stand-in previews pane one at the position the consumer will
    // restore on landing — not at its top (jsdom offsetTop is 0, so the
    // remembered container offset is the pane-local offset verbatim).
    const ghost = screen.getByTestId("slide-stack-pane-one-ghost");
    const offsetWrapper = ghost.firstElementChild as HTMLElement;
    expect(offsetWrapper.style.transform).toBe("translateY(-480px)");
    expect(ghost.className).toContain("overflow-hidden");
  });

  it("shows the ghost from its top when there is no memory", () => {
    renderStack();

    dragBackFrom("two");

    const ghost = screen.getByTestId("slide-stack-pane-one-ghost");
    // No offset wrapper: the pane content is the ghost's direct child.
    expect(
      (ghost.firstElementChild as HTMLElement).style.transform,
    ).not.toContain("translateY");
    expect(ghost.className).not.toContain("overflow-hidden");
  });
});

/** A stack whose header rides the ghost, inside a measurable scroll viewport. */
function renderComposite(paneScrollMemory: (paneId: string) => number): void {
  // jsdom always reports offsetParent as null, and the stack reads it to map
  // the scroll viewport into the panes' coordinate space — without it the
  // measurement is skipped and the ghost never becomes a composite at all.
  // Any element will do: every rect is zero here, so only its presence counts.
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(
    document.body,
  );
  render(
    <LazyMotion features={domAnimation}>
      <div
        data-testid="scroller"
        // Inline, not by class: jsdom leaves class-based styles out of
        // computed style, and the stack finds its scroll viewport by overflow.
        style={{ overflowY: "auto" }}
      >
        <div style={{ position: "relative", overflow: "hidden" }}>
          <SlideStack
            activeId="two"
            header={<div data-testid="header" />}
            onBack={vi.fn()}
            paneScrollMemory={paneScrollMemory}
          >
            <SlideStackPane id="one">
              <div data-testid="content-one" />
            </SlideStackPane>
            <SlideStackPane id="two">
              <div data-testid="content-two" />
            </SlideStackPane>
          </SlideStack>
        </div>
      </div>
    </LazyMotion>,
  );
}

describe("SlideStack composite ghost", () => {
  it("lays the pane out against the viewport, as the real scroll container does", () => {
    renderComposite(() => 0);
    Object.defineProperty(screen.getByTestId("scroller"), "clientHeight", {
      configurable: true,
      value: 800,
    });

    dragBackFrom("two");

    // The wrapper stands in for the page's scroll container. Panes size
    // themselves against it — a staged form step fills it with `grow` so its
    // footer lands at the bottom — so it has to be the same kind of box, or
    // the preview collapses to content height and everything anchored to the
    // bottom floats up.
    const wrapper = screen.getByTestId("slide-stack-pane-one-ghost")
      .firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("min-h-full");
    expect(wrapper.className).toContain("flex-col");
  });

  it("clamps a remembered offset the target can no longer scroll to", () => {
    // Remembered deeper than this pane's current extent — a real case: the
    // position was reachable when it was recorded (keyboard inset open, a
    // section expanded) and is not any more.
    renderComposite((paneId) => (paneId === "one" ? 1000 : 0));
    Object.defineProperty(screen.getByTestId("scroller"), "clientHeight", {
      configurable: true,
      value: 800,
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(1200);

    dragBackFrom("two");

    // Content 1200 in an 800 viewport scrolls to 400 at most. Previewing the
    // requested 1000 would show 600px of blank past the end, then jump when
    // the landing clamps to the same 400.
    const wrapper = screen.getByTestId("slide-stack-pane-one-ghost")
      .firstElementChild as HTMLElement;
    expect(wrapper.style.transform).toBe("translateY(-400px)");
  });
});
