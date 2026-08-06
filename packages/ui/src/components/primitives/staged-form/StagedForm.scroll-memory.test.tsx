import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState } from "react";

import { StagedForm } from "./StagedForm";
import { StagedFormStep } from "./StagedFormStep";
import type { StepConfig } from "./staged-form.types";

const STEPS: StepConfig[] = [
  { id: "one", title: "One" },
  { id: "two", title: "Two" },
];

function Harness(): React.JSX.Element {
  const [activeStepId, setActiveStepId] = useState("one");

  return (
    <LazyMotion features={domAnimation}>
      <button
        data-testid="go-two"
        type="button"
        onClick={() => setActiveStepId("two")}
      >
        two
      </button>
      <button
        data-testid="go-one"
        type="button"
        onClick={() => setActiveStepId("one")}
      >
        one
      </button>
      <StagedForm
        steps={STEPS}
        activeStepId={activeStepId}
        isFirstStep={activeStepId === "one"}
        isLastStep={activeStepId === "two"}
        showNavigation={false}
        onAdvance={() => setActiveStepId("two")}
        onBack={() => setActiveStepId("one")}
        onNavigate={setActiveStepId}
      >
        {STEPS.map((step) => (
          <StagedFormStep key={step.id} id={step.id}>
            <div />
          </StagedFormStep>
        ))}
      </StagedForm>
    </LazyMotion>
  );
}

// jsdom has no element scrolling; the timeline centres its chips via scrollTo.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StagedForm per-step scroll memory", () => {
  it("starts a first visit at the top and restores the position on return", () => {
    render(<Harness />);
    const scroller = screen.getByTestId("staged-form-scroll-container");

    // The user reads step one scrolled deep.
    scroller.scrollTop = 480;

    act(() => {
      screen.getByTestId("go-two").click();
    });
    // A step never visited starts at its top.
    expect(scroller.scrollTop).toBe(0);

    scroller.scrollTop = 120;
    act(() => {
      screen.getByTestId("go-one").click();
    });
    // Back on step one: exactly where it was left.
    expect(scroller.scrollTop).toBe(480);

    act(() => {
      screen.getByTestId("go-two").click();
    });
    // Step two remembered its own position independently.
    expect(scroller.scrollTop).toBe(120);
  });

  it("overwrites a step's memory with the latest position", () => {
    render(<Harness />);
    const scroller = screen.getByTestId("staged-form-scroll-container");

    scroller.scrollTop = 480;
    act(() => {
      screen.getByTestId("go-two").click();
    });
    act(() => {
      screen.getByTestId("go-one").click();
    });
    expect(scroller.scrollTop).toBe(480);

    // Re-read step one somewhere else, leave again, come back.
    scroller.scrollTop = 42;
    act(() => {
      screen.getByTestId("go-two").click();
    });
    act(() => {
      screen.getByTestId("go-one").click();
    });
    expect(scroller.scrollTop).toBe(42);
  });

  it("keeps its memory when the stack can see the shared scroller", () => {
    render(<Harness />);
    const scroller = screen.getByTestId("staged-form-scroll-container");
    // Two details jsdom does not supply on its own, both needed for the stack
    // to reach the same code path it takes in a browser:
    //  - the form's scroll container is styled by class, which jsdom leaves
    //    out of computed style, so the stack's scroller lookup finds nothing
    //    and its internal memory silently no-ops;
    //  - every element measures 0, which makes the stack's clamp ceiling come
    //    out equal to the current scroll position — a no-op clamp.
    // Declaring the overflow and a viewport shorter than the step's content
    // reproduces the real case: advancing to a step too short to hold the
    // current scroll depth, where the clamp genuinely moves the scroller.
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "clientHeight", { value: 800 });
    const rect = { top: 0, height: 300 } as DOMRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);

    scroller.scrollTop = 480;
    act(() => {
      screen.getByTestId("go-two").click();
    });
    act(() => {
      screen.getByTestId("go-one").click();
    });
    // The stack's landing effect runs before this form's (child effects run
    // first) — if it moves the scroller, the save below it records that value
    // instead of where the user actually was, and the position is lost.
    expect(scroller.scrollTop).toBe(480);
  });
});
