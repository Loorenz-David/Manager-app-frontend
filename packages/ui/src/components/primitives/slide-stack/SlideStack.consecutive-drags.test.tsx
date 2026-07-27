import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { SlideStack, SlideStackPane } from ".";

const ORDER = ["one", "two", "three"];

// Mirrors real usage: activeId is consumer state driven by onBack/onForward,
// exercising the full drag → commit → navigate → ghost-handoff cycle several
// times in a row (regression: after the first committed drag, later drags
// must still engage and navigate).
function StatefulStack(): React.JSX.Element {
  const [active, setActive] = useState("one");
  const index = ORDER.indexOf(active);
  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div data-testid="active-label">{active}</div>
        <SlideStack
          activeId={active}
          onBack={() => setActive(ORDER[index - 1] ?? active)}
          onForward={() => setActive(ORDER[index + 1] ?? active)}
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
    value: type === "touchend" ? [] : [{ clientX: x, clientY: y }],
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

function dragBack(paneId: string): void {
  const pane = screen.getByTestId(`slide-stack-pane-${paneId}`);
  dispatchTouch(pane, "touchstart", 20, 100);
  dispatchTouch(pane, "touchmove", 20 + commitTravel() / 2, 104);
  dispatchTouch(pane, "touchmove", 20 + commitTravel(), 106);
  dispatchTouch(pane, "touchend", 20 + commitTravel(), 106);
}

async function expectActive(id: string): Promise<void> {
  await waitFor(
    () => expect(screen.getByTestId("active-label").textContent).toBe(id),
    { timeout: 3000 },
  );
  // Wait for the ghost and the outgoing pane to fully clear before the next
  // drag, like a user pausing between gestures.
  await waitFor(
    () =>
      expect(
        document.querySelector('[data-testid$="-ghost"]'),
      ).toBeNull(),
    { timeout: 3000 },
  );
}

afterEach(cleanup);

describe("SlideStack consecutive interactive drags", () => {
  it("a new touch fast-forwards a settling drag instead of waiting it out", async () => {
    render(<StatefulStack />);

    // Committed forward drag: release starts the ~240ms settle animation.
    dragForward("one");
    expect(screen.getByTestId("active-label").textContent).toBe("one");

    // Touch again immediately — the pending navigation must finalize now,
    // not after the settle animation finishes.
    const pane = screen.getByTestId("slide-stack-pane-one");
    dispatchTouch(pane, "touchstart", 200, 100);
    await act(async () => {});
    expect(screen.getByTestId("active-label").textContent).toBe("two");
    dispatchTouch(pane, "touchend", 200, 100);

    // And the new active pane drags normally right away.
    dragBack("two");
    await waitFor(
      () => expect(screen.getByTestId("active-label").textContent).toBe("one"),
      { timeout: 3000 },
    );
  });

  it("forward, forward, back, back all navigate", async () => {
    render(<StatefulStack />);

    dragForward("one");
    await expectActive("two");
    await waitFor(
      () => expect(screen.queryByTestId("slide-stack-pane-one")).toBeNull(),
      { timeout: 3000 },
    );

    dragForward("two");
    await expectActive("three");
    await waitFor(
      () => expect(screen.queryByTestId("slide-stack-pane-two")).toBeNull(),
      { timeout: 3000 },
    );

    dragBack("three");
    await expectActive("two");
    await waitFor(
      () => expect(screen.queryByTestId("slide-stack-pane-three")).toBeNull(),
      { timeout: 3000 },
    );

    dragBack("two");
    await expectActive("one");
  });
});
