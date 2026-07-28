import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { SlideStack, SlideStackPane } from ".";

const ORDER = ["one", "two", "three"];

/**
 * A consumer that navigates a tick late — what a react-router data router does
 * (`navigate()` resolves through the router before the pane state changes).
 */
function AsyncStack({
  awaitNavigation,
}: {
  awaitNavigation: boolean;
}): React.JSX.Element {
  const [active, setActive] = useState("one");
  const index = ORDER.indexOf(active);

  const navigateLate = (next: string | undefined) => {
    if (!next) return;
    void Promise.resolve().then(() => setActive(next));
  };

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div data-testid="active-label">{active}</div>
        <SlideStack
          activeId={active}
          awaitNavigation={awaitNavigation}
          onBack={() => navigateLate(ORDER[index - 1])}
          onForward={() => navigateLate(ORDER[index + 1])}
        >
          {ORDER.map((id) => (
            <SlideStackPane id={id} key={id}>
              <div data-testid={`content-${id}`} />
            </SlideStackPane>
          ))}
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

function dragForward(paneId: string): void {
  const pane = screen.getByTestId(`slide-stack-pane-${paneId}`);
  const startX = 20 + commitTravel();
  dispatchTouch(pane, "touchstart", startX, 100);
  dispatchTouch(pane, "touchmove", startX - commitTravel() / 2, 104);
  dispatchTouch(pane, "touchmove", startX - commitTravel(), 106);
  dispatchTouch(pane, "touchend", startX - commitTravel(), 106);
}

function ghost(): Element | null {
  return document.querySelector('[data-testid$="-ghost"]');
}

afterEach(cleanup);

describe("SlideStack with an asynchronously navigating consumer", () => {
  it("keeps the stand-in ghost until the navigation lands", async () => {
    render(<AsyncStack awaitNavigation />);

    dragForward("one");
    // Settle finished, navigation requested, pane state not updated yet — the
    // window in which the outgoing pane would otherwise flash into view.
    await waitFor(() => expect(ghost()).not.toBeNull(), { timeout: 3000 });
    expect(screen.getByTestId("active-label").textContent).toBe("one");

    await waitFor(
      () => expect(screen.getByTestId("active-label").textContent).toBe("two"),
      { timeout: 3000 },
    );
    // Handed off to the real pane once it is there.
    await waitFor(() => expect(ghost()).toBeNull(), { timeout: 3000 });
    expect(screen.getByTestId("content-two")).toBeTruthy();
  });

  it("still navigates exactly once", async () => {
    render(<AsyncStack awaitNavigation />);

    dragForward("one");
    await waitFor(
      () => expect(screen.getByTestId("active-label").textContent).toBe("two"),
      { timeout: 3000 },
    );

    // A pane per commit — never two hops from one drag (the finalizer runs
    // again via settleNow on the next touch).
    const pane = screen.getByTestId("slide-stack-pane-two");
    dispatchTouch(pane, "touchstart", 200, 100);
    dispatchTouch(pane, "touchend", 200, 100);
    await act(async () => {});
    expect(screen.getByTestId("active-label").textContent).toBe("two");
  });

  it("without the flag the ghost goes before the navigation lands", async () => {
    render(<AsyncStack awaitNavigation={false} />);

    dragForward("one");
    await waitFor(
      () => expect(screen.getByTestId("active-label").textContent).toBe("two"),
      { timeout: 3000 },
    );
    // Documents why the flag exists: the default contract removes the ghost
    // with the navigation request, which only works for sync consumers.
    expect(ghost()).toBeNull();
  });
});
