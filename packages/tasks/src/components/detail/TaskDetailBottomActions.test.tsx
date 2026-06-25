import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskDetailBottomActions } from "./TaskDetailBottomActions";

const requestCloseMock = vi.fn();

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    requestClose: requestCloseMock,
  }),
}));

function buildProps({
  shouldRenderAssignStages = true,
}: {
  shouldRenderAssignStages?: boolean;
} = {}) {
  return {
    shouldRenderAssignStages,
    onEdit: vi.fn(),
    onOpenWorkingSections: vi.fn(),
  };
}

describe("TaskDetailBottomActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestCloseMock.mockReset();
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

  it("does not show Assign Stages when disabled", () => {
    render(
      <TaskDetailBottomActions
        {...buildProps({ shouldRenderAssignStages: false })}
      />,
    );

    expect(
      screen.queryByTestId("task-detail-assign-stages-button"),
    ).not.toBeInTheDocument();
  });

  it("opens the working sections slide when Assign Stages is tapped", () => {
    const props = buildProps();

    render(<TaskDetailBottomActions {...props} />);

    screen.getByTestId("task-detail-assign-stages-button").click();

    expect(props.onOpenWorkingSections).toHaveBeenCalledTimes(1);
  });

  it("keeps Edit and Close & Back working", () => {
    const props = buildProps({ shouldRenderAssignStages: false });

    render(<TaskDetailBottomActions {...props} />);

    screen.getByRole("button", { name: "Edit" }).click();
    screen.getByRole("button", { name: "Close & Back" }).click();

    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(requestCloseMock).toHaveBeenCalledTimes(1);
  });
});
