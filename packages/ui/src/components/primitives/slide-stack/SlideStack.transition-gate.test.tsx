import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { SlideStack, SlideStackPane } from ".";
import {
  resetUiTransitionGate,
  runWhenUiSettled,
} from "../../../lib/ui-transition-gate";

/**
 * A consumer shaped like the pages that navigate and fetch in one tap: opening
 * a row both slides to the next pane and asks for that pane's data. The
 * request resolves well inside the animation, so rendering its result has to
 * wait for the pane to stop moving.
 */
function NavigateAndFetch({ onLoad }: { onLoad: () => void }): React.JSX.Element {
  const [active, setActive] = useState("list");

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <button
          data-testid="open"
          type="button"
          onClick={() => {
            setActive("detail");
            runWhenUiSettled(onLoad);
          }}
        >
          open
        </button>
        <SlideStack activeId={active}>
          <SlideStackPane id="list">
            <div data-testid="content-list" />
          </SlideStackPane>
          <SlideStackPane id="detail">
            <div data-testid="content-detail" />
          </SlideStackPane>
        </SlideStack>
      </div>
    </LazyMotion>
  );
}

/** Lets every queued requestAnimationFrame callback run. */
async function flushFrames(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
  }
}

afterEach(() => {
  cleanup();
  resetUiTransitionGate();
});

describe("SlideStack transition gate", () => {
  it("holds queued work while a pane is sliding away", async () => {
    const onLoad = vi.fn();
    render(<NavigateAndFetch onLoad={onLoad} />);

    act(() => {
      screen.getByTestId("open").click();
    });

    // The outgoing pane is still animating. Letting the work run here is the
    // bug: its render lands in the middle of the transition.
    await flushFrames();
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByTestId("slide-stack-pane-list")).toBeTruthy();
  });

  it("releases the work once the transition finishes", async () => {
    const onLoad = vi.fn();
    render(<NavigateAndFetch onLoad={onLoad} />);

    act(() => {
      screen.getByTestId("open").click();
    });

    // Outlast the slide, then let the queue's frame land.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    await flushFrames();

    expect(onLoad).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("slide-stack-pane-list")).toBeNull();
  });
});
