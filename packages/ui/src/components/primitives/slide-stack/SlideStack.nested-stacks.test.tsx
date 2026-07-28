import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { SlideStack, SlideStackPane } from ".";

const OUTER = ["tab-a", "tab-b"];
const INNER = ["list", "detail"];

/**
 * A drill-down stack living inside a pane of a shell-level tab stack — the
 * app-shell arrangement. Touch events bubble through both panes, so both
 * stacks see the same finger.
 */
function NestedStacks({
  initialInner,
}: {
  initialInner: string;
}): React.JSX.Element {
  const [outer, setOuter] = useState("tab-b");
  const [inner, setInner] = useState(initialInner);
  const outerIndex = OUTER.indexOf(outer);
  const innerIndex = INNER.indexOf(inner);

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div data-testid="outer-label">{outer}</div>
        <div data-testid="inner-label">{inner}</div>
        <SlideStack
          activeId={outer}
          onBack={() => setOuter(OUTER[outerIndex - 1] ?? outer)}
          onForward={() => setOuter(OUTER[outerIndex + 1] ?? outer)}
        >
          <SlideStackPane id="tab-a">
            <div data-testid="content-tab-a" />
          </SlideStackPane>

          <SlideStackPane id="tab-b">
            <SlideStack
              activeId={inner}
              onBack={() => setInner(INNER[innerIndex - 1] ?? inner)}
            >
              {INNER.map((id) => (
                <SlideStackPane id={id} key={id}>
                  <div data-testid={`content-${id}`} />
                </SlideStackPane>
              ))}
            </SlideStack>
          </SlideStackPane>
        </SlideStack>
      </div>
    </LazyMotion>
  );
}

function dispatchTouch(
  element: Element,
  type: "touchstart" | "touchmove" | "touchend",
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [{ clientX: x, clientY: y, identifier: 1 }],
  });
  act(() => {
    element.dispatchEvent(event);
  });
}

function commitTravel(): number {
  return Math.round(window.innerWidth * 0.6);
}

function dragBack(paneId: string): void {
  const pane = screen.getByTestId(`slide-stack-pane-${paneId}`);
  dispatchTouch(pane, "touchstart", 20, 100);
  dispatchTouch(pane, "touchmove", 20 + commitTravel() / 2, 104);
  dispatchTouch(pane, "touchmove", 20 + commitTravel(), 106);
  dispatchTouch(pane, "touchend", 20 + commitTravel(), 106);
}

afterEach(cleanup);

describe("SlideStack nested stacks", () => {
  it("the inner stack owns a back drag it can serve", async () => {
    render(<NestedStacks initialInner="detail" />);

    dragBack("detail");

    await waitFor(
      () => expect(screen.getByTestId("inner-label").textContent).toBe("list"),
      { timeout: 3000 },
    );
    // The same finger must not have moved the shell's tabs as well.
    expect(screen.getByTestId("outer-label").textContent).toBe("tab-b");
  });

  it("a back drag the inner stack refuses falls through to the outer stack", async () => {
    render(<NestedStacks initialInner="list" />);

    // First inner pane: nothing to go back to, so the gesture belongs to the
    // tab stack around it.
    dragBack("list");

    await waitFor(
      () => expect(screen.getByTestId("outer-label").textContent).toBe("tab-a"),
      { timeout: 3000 },
    );
    expect(screen.getByTestId("inner-label").textContent).toBe("list");
  });
});
