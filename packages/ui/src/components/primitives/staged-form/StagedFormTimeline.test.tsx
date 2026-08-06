import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";

import { StagedForm } from "./StagedForm";
import { StagedFormStep } from "./StagedFormStep";
import type { StepConfig, StepStatusMap } from "./staged-form.types";

const STEPS: StepConfig[] = [
  { id: "item", title: "Item" },
  { id: "assignment", title: "Assignment" },
  { id: "details", title: "Details" },
];

function Form({
  steps = STEPS,
  activeStepId = "assignment",
  stepStatusMap = { item: "completed" },
  onAdvance = vi.fn(),
  footer,
  showNavigation = false,
}: {
  steps?: StepConfig[];
  activeStepId?: string;
  stepStatusMap?: StepStatusMap;
  onAdvance?: () => void;
  footer?: React.ComponentProps<typeof StagedForm>["footer"];
  showNavigation?: boolean;
}): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation}>
      <StagedForm
        steps={steps}
        activeStepId={activeStepId}
        footer={footer}
        stepStatusMap={stepStatusMap}
        isFirstStep={false}
        isLastStep={false}
        showNavigation={showNavigation}
        onAdvance={onAdvance}
        onBack={vi.fn()}
        onNavigate={vi.fn()}
      >
        {steps.map((step) => (
          <StagedFormStep key={step.id} id={step.id}>
            <div />
          </StagedFormStep>
        ))}
      </StagedForm>
    </LazyMotion>
  );
}

function ControlledFooterForm(): React.JSX.Element {
  const [activeStepId, setActiveStepId] = useState("assignment");

  return (
    <Form
      activeStepId={activeStepId}
      footer={({ stepId }) => (
        <span data-testid="footer-step">{stepId}</span>
      )}
      onAdvance={() => setActiveStepId("details")}
    />
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

// jsdom has no element scrolling; the timeline centres the active chip via
// its own scroller's scrollTo on mount.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

afterEach(cleanup);

describe("StagedForm", () => {
  it("numbers the active and pending steps and checks off completed ones", () => {
    render(<Form />);

    expect(screen.getByTestId("staged-form-step-item-indicator")).toHaveAttribute(
      "data-status",
      "completed",
    );
    // Completed steps swap their number for a check icon.
    expect(
      screen.getByTestId("staged-form-step-item-indicator").textContent,
    ).toBe("Item");
    expect(
      screen.getByTestId("staged-form-step-assignment-indicator").textContent,
    ).toBe("2Assignment");
    expect(
      screen.getByTestId("staged-form-step-details-indicator").textContent,
    ).toBe("3Details");
  });

  it("renders the number alone when a title is too long for the row", () => {
    render(
      <Form
        steps={[
          { id: "item", title: "Item" },
          { id: "assignment", title: "Assignment and scheduling" },
        ]}
      />,
    );

    expect(
      screen.queryByTestId("staged-form-step-assignment-label"),
    ).not.toBeInTheDocument();
    const indicator = screen.getByTestId("staged-form-step-assignment-indicator");
    expect(indicator).toHaveAttribute("title", "Assignment and scheduling");
    // The title survives for assistive tech via the sr-only span.
    expect(indicator.textContent).toBe("2Assignment and scheduling");
  });

  it("moves to the committed step at the release, before the pane swap", async () => {
    const onAdvance = vi.fn();
    render(<Form onAdvance={onAdvance} />);

    // Drag the active pane leftward past the commit threshold and let go.
    const pane = screen.getByTestId("staged-form-step-assignment");
    const travel = Math.round(window.innerWidth * 0.6);
    const startX = 10 + travel;
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - travel, 104);
    dispatchTouch(pane, "touchend", startX - travel, 104);

    // The navigation itself is still one settle away, but the timeline has
    // already moved on.
    expect(onAdvance).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("staged-form-step-details-indicator"),
    ).toHaveAttribute("data-status", "active");
    expect(
      screen.getByTestId("staged-form-step-assignment-indicator"),
    ).toHaveAttribute("data-status", "completed");
  });

  it("renders each step-aware footer inside its slide pane", () => {
    const onAdvance = vi.fn();
    render(
      <Form
        footer={({ stepId }) => (
          <span data-testid="footer-step">{stepId}</span>
        )}
        onAdvance={onAdvance}
      />,
    );

    const pane = screen.getByTestId("staged-form-step-assignment");
    expect(within(pane).getByTestId("footer-step")).toHaveTextContent(
      "assignment",
    );

    const travel = Math.round(window.innerWidth * 0.6);
    const startX = 10 + travel;
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - travel, 104);

    // The target's body and footer are already together in the draggable
    // ghost pane before the finger is released.
    const ghost = screen.getByTestId("staged-form-step-details-ghost");
    expect(onAdvance).not.toHaveBeenCalled();
    expect(within(ghost).getByTestId("footer-step")).toHaveTextContent(
      "details",
    );
  });

  it("renders the correct default navigation inside the target pane", () => {
    const onAdvance = vi.fn();
    render(<Form onAdvance={onAdvance} showNavigation />);

    const pane = screen.getByTestId("staged-form-step-assignment");
    const travel = Math.round(window.innerWidth * 0.6);
    const startX = 10 + travel;
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - travel, 104);

    const ghost = screen.getByTestId("staged-form-step-details-ghost");
    expect(onAdvance).not.toHaveBeenCalled();
    expect(
      within(pane).getByTestId("staged-form-advance-button"),
    ).toHaveTextContent("Next");
    expect(
      within(ghost).getByTestId("staged-form-advance-button"),
    ).toHaveTextContent("Submit");
  });

  it("hands the destination footer from the ghost to the real pane", async () => {
    render(<ControlledFooterForm />);

    const pane = screen.getByTestId("staged-form-step-assignment");
    const travel = Math.round(window.innerWidth * 0.6);
    const startX = 10 + travel;
    dispatchTouch(pane, "touchstart", startX, 100);
    dispatchTouch(pane, "touchmove", startX - travel, 104);

    expect(
      within(
        screen.getByTestId("staged-form-step-details-ghost"),
      ).getByTestId("footer-step"),
    ).toHaveTextContent("details");

    dispatchTouch(pane, "touchend", startX - travel, 104);

    await waitFor(
      () =>
        expect(
          screen.queryByTestId("staged-form-step-details-ghost"),
        ).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(
      within(screen.getByTestId("staged-form-step-details")).getByTestId(
        "footer-step",
      ),
    ).toHaveTextContent("details");
  });

  it("gives the committed step back when the consumer declines to advance", async () => {
    vi.useFakeTimers();
    try {
      render(<Form />);

      const pane = screen.getByTestId("staged-form-step-assignment");
      const travel = Math.round(window.innerWidth * 0.6);
      const startX = 10 + travel;
      dispatchTouch(pane, "touchstart", startX, 100);
      dispatchTouch(pane, "touchmove", startX - travel, 104);
      dispatchTouch(pane, "touchend", startX - travel, 104);

      expect(
        screen.getByTestId("staged-form-step-details-indicator"),
      ).toHaveAttribute("data-status", "active");

      // onAdvance never changed activeStepId — the guess expires.
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(
        screen.getByTestId("staged-form-step-assignment-indicator"),
      ).toHaveAttribute("data-status", "active");
    } finally {
      vi.useRealTimers();
    }
  });

  it("fills the connectors up to the active step", () => {
    render(<Form />);

    const toAssignment = screen
      .getByTestId("staged-form-connector-assignment")
      .querySelector("div");
    const toDetails = screen
      .getByTestId("staged-form-connector-details")
      .querySelector("div");

    expect(toAssignment?.className).toContain("w-full");
    expect(toDetails?.className).toContain("w-0");
  });
});
