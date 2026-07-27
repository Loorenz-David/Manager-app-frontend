import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskDetailBottomActions } from "./TaskDetailBottomActions";

function buildProps({
  shouldRenderAssignStages = true,
}: {
  shouldRenderAssignStages?: boolean;
} = {}) {
  return {
    shouldRenderAssignStages,
    onOpenWorkingSections: vi.fn(),
  };
}

describe("TaskDetailBottomActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows Assign Stages after the reveal delay", () => {
    render(<TaskDetailBottomActions {...buildProps()} />);

    const ctaLayer = screen.getByTestId("task-detail-assign-stages-layer");
    expect(ctaLayer).toHaveAttribute("data-visible", "false");
    expect(
      screen.getByTestId("task-detail-assign-stages-button"),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(240);
    });

    expect(ctaLayer).toHaveAttribute("data-visible", "true");
  });

  it("renders nothing at all when Assign Stages is not applicable", () => {
    // No Close & Back / Edit bar remains, so with no CTA there is no footer:
    // the page is dismissed by the surface's slide-to-close gesture.
    render(
      <TaskDetailBottomActions
        {...buildProps({ shouldRenderAssignStages: false })}
      />,
    );

    expect(
      screen.queryByTestId("task-detail-assign-stages-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("task-detail-bottom-actions"),
    ).not.toBeInTheDocument();
  });

  it("opens the working sections slide when Assign Stages is tapped", () => {
    const props = buildProps();

    render(<TaskDetailBottomActions {...props} />);

    screen.getByTestId("task-detail-assign-stages-button").click();

    expect(props.onOpenWorkingSections).toHaveBeenCalledTimes(1);
  });

  it("no longer renders a Close & Back or Edit action", () => {
    render(<TaskDetailBottomActions {...buildProps()} />);

    expect(
      screen.queryByRole("button", { name: "Close & Back" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
