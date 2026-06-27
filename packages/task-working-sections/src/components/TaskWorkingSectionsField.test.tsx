import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskWorkingSectionsField } from "./TaskWorkingSectionsField";

const useTaskWorkingSectionsCountsFlowMock = vi.fn();

vi.mock("../flows/use-task-working-sections-counts.flow", () => ({
  useTaskWorkingSectionsCountsFlow: (
    taskId: string | null | undefined,
  ) => useTaskWorkingSectionsCountsFlowMock(taskId),
}));

describe("TaskWorkingSectionsField", () => {
  it("renders assigned and completed counts from the counts flow", () => {
    useTaskWorkingSectionsCountsFlowMock.mockReturnValue({
      assignedCount: 4,
      completedCount: 2,
      isPending: false,
      isError: false,
    });

    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={vi.fn()}
        taskId="task_1"
      />,
    );

    expect(screen.getByTestId("working-sections-assigned-count")).toHaveTextContent(
      "4 assigned",
    );
    expect(
      screen.getByTestId("working-sections-completed-count"),
    ).toHaveTextContent("2 completed");
  });

  it("shows zero counts when the flow returns zero counts", () => {
    useTaskWorkingSectionsCountsFlowMock.mockReturnValue({
      assignedCount: 0,
      completedCount: 0,
      isPending: false,
      isError: false,
    });

    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={vi.fn()}
        taskId="task_2"
      />,
    );

    expect(screen.getByTestId("working-sections-assigned-count")).toHaveTextContent(
      "0 assigned",
    );
    expect(
      screen.getByTestId("working-sections-completed-count"),
    ).toHaveTextContent("0 completed");
  });

  it("opens the slide when pressed", async () => {
    const user = userEvent.setup();
    const onOpenWorkingSections = vi.fn();
    useTaskWorkingSectionsCountsFlowMock.mockReturnValue({
      assignedCount: 0,
      completedCount: 0,
      isPending: false,
      isError: false,
    });

    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={onOpenWorkingSections}
        taskId="task_3"
      />,
    );
    await user.click(screen.getByTestId("task-working-sections-field"));

    expect(onOpenWorkingSections).toHaveBeenCalledTimes(1);
  });
});
