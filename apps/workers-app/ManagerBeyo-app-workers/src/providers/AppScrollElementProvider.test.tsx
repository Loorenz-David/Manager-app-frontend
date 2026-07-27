import { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useScrollVisibilityContext } from "@beyo/ui";
import { afterEach, describe, expect, it } from "vitest";

import {
  AppScrollElementProvider,
  useRegisterScrollElement,
} from "./AppScrollElementProvider";

/** Stands in for a mounted view that owns a scroll container. */
function Scroller({ element }: { element: HTMLElement }): null {
  const registerScrollElement = useRegisterScrollElement();

  useEffect(
    () => registerScrollElement(element),
    [element, registerScrollElement],
  );

  return null;
}

function Harness({ scrollers }: { scrollers: HTMLElement[] }): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <>
      <div data-testid="hidden">{String(isHidden)}</div>
      {scrollers.map((element) => (
        <Scroller key={element.id} element={element} />
      ))}
    </>
  );
}

function renderHarness(scrollers: HTMLElement[]) {
  const { rerender } = render(
    <AppScrollElementProvider>
      <Harness scrollers={scrollers} />
    </AppScrollElementProvider>,
  );

  return (next: HTMLElement[]) =>
    rerender(
      <AppScrollElementProvider>
        <Harness scrollers={next} />
      </AppScrollElementProvider>,
    );
}

function isHidden(): boolean {
  return screen.getByTestId("hidden").textContent === "true";
}

function makeScroller(id: string): HTMLElement {
  const element = document.createElement("div");
  element.id = id;
  document.body.appendChild(element);
  return element;
}

function emitScroll(element: HTMLElement, top: number): void {
  act(() => {
    // jsdom never lays out, so elements are never scrollable and the real
    // scrollTop setter is a no-op — define the value instead.
    Object.defineProperty(element, "scrollTop", {
      configurable: true,
      value: top,
      writable: true,
    });
    element.dispatchEvent(new Event("scroll"));
  });
}

/**
 * Scrolls an element far enough down to trip the hide threshold (56px).
 * Two steps are required: relative mode spends the first one anchoring the
 * new scroll direction and only accumulates progress from there. Registering
 * a container also suppresses scroll handling for 120ms — wait that out first.
 */
async function scrollDown(element: HTMLElement): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  emitScroll(element, 100);
  emitScroll(element, 400);
}

afterEach(() => {
  document.body.innerHTML = "";
  cleanup();
});

describe("AppScrollElementProvider", () => {
  it("tracks the most recent registration while several are live", async () => {
    const first = makeScroller("first");
    const second = makeScroller("second");
    renderHarness([first, second]);

    // Scrolling the stale container must not drive visibility…
    await scrollDown(first);
    expect(isHidden()).toBe(false);

    // …the newest one does.
    await scrollDown(second);
    expect(isHidden()).toBe(true);
  });

  // Registrations overlap during a slide-stack drag: the pane beneath the
  // active one mounts as a ghost copy and registers its own scroller. When the
  // drag is cancelled and that ghost unmounts, the still-mounted pane must
  // become current again instead of the app being left with none.
  it("falls back to the previous registration when the newest unmounts", async () => {
    const pane = makeScroller("pane");
    const ghost = makeScroller("ghost");
    const rerender = renderHarness([pane, ghost]);

    rerender([pane]);

    await scrollDown(pane);
    expect(isHidden()).toBe(true);
  });

  it("keeps the incoming registration when an outgoing one tears down late", async () => {
    const outgoing = makeScroller("outgoing");
    const incoming = makeScroller("incoming");
    const rerender = renderHarness([outgoing]);

    // Page-transition order: the incoming container mounts before the outgoing
    // one unmounts — the incoming must stay current.
    rerender([outgoing, incoming]);
    rerender([incoming]);

    await scrollDown(incoming);
    expect(isHidden()).toBe(true);
  });
});
