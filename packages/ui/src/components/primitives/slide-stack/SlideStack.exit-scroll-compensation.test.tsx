import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { SlideStack, SlideStackPane } from ".";

/**
 * A consumer shaped like StagedForm: per-pane scroll memory on one shared
 * scroll container, saved/restored in the same commit as the pane swap.
 * popLayout pins the exiting pane in content coordinates, so without
 * compensation the restore would visually snap it away from the region the
 * user was reading. The pane derives the compensation from the memory itself
 * — no DOM measurement — so the test drives it purely through the callback.
 */
function ScrollMemoryStack({
  memory,
}: {
  memory?: Record<string, number>;
}): React.JSX.Element {
  const [active, setActive] = useState("one");

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <button
          data-testid="advance"
          type="button"
          onClick={() => setActive("two")}
        >
          next
        </button>
        <SlideStack
          activeId={active}
          paneScrollMemory={
            memory ? (paneId) => memory[paneId] ?? 0 : undefined
          }
        >
          <SlideStackPane id="one">
            <div data-testid="content-one" />
          </SlideStackPane>
          <SlideStackPane id="two">
            <div data-testid="content-two" />
          </SlideStackPane>
        </SlideStack>
      </div>
    </LazyMotion>
  );
}

afterEach(cleanup);

describe("SlideStack exit scroll compensation", () => {
  it("holds the exiting pane at its visual position across the memory swap", async () => {
    // The user left pane one scrolled 500 deep; pane two starts at its top.
    // The consumer's restore moves the shared scroller 500 → 0 at the swap.
    render(<ScrollMemoryStack memory={{ one: 500, two: 0 }} />);

    const paneOne = screen.getByTestId("slide-stack-pane-one");
    act(() => {
      screen.getByTestId("advance").click();
    });

    // The exiting pane (kept mounted by popLayout for its exit) is shifted by
    // the same delta the scroller moved, so on screen it never jumps.
    await waitFor(() => {
      expect(paneOne.style.transform).toContain("translateY(-500px)");
    });
  });

  it("clips the lifted part so it cannot paint over content above the panes", async () => {
    render(<ScrollMemoryStack memory={{ one: 500, two: 0 }} />);

    const paneOne = screen.getByTestId("slide-stack-pane-one");
    act(() => {
      screen.getByTestId("advance").click();
    });

    // Lifting the pane 500px pushes it out of its own flow box and into
    // whatever the consumer renders above the panes — a header. popLayout has
    // already made it absolutely positioned with a z-index, so it would paint
    // over that static chrome (at its 0.7 exit opacity) for the whole exit.
    // Clipping the lifted 500px restores its original top edge.
    await waitFor(() => {
      expect(paneOne.style.clipPath).toBe("inset(500px 0 0 0)");
    });
  });

  it("leaves a downward-shifted exiting pane unclipped", async () => {
    // Moving down cannot reach the region above the panes, and clipping there
    // would hide content that is legitimately on screen.
    render(<ScrollMemoryStack memory={{ one: 0, two: 500 }} />);

    const paneOne = screen.getByTestId("slide-stack-pane-one");
    act(() => {
      screen.getByTestId("advance").click();
    });

    await waitFor(() => {
      expect(paneOne.style.transform).toContain("translateY(500px)");
    });
    expect(paneOne.style.clipPath).toBe("");
  });

  it("does nothing without scroll memory — the shared scroll never moves", async () => {
    render(<ScrollMemoryStack />);

    const paneOne = screen.getByTestId("slide-stack-pane-one");
    act(() => {
      screen.getByTestId("advance").click();
    });

    await act(async () => {});
    expect(paneOne.style.transform).not.toContain("translateY(-");
  });
});
