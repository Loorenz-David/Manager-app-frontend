import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskWorkingSectionsField } from "./TaskWorkingSectionsField";

describe("TaskWorkingSectionsField", () => {
  it("renders assigned and completed counts from task steps", () => {
    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={vi.fn()}
        taskSteps={[
          {
            working_section_id: "ws_1",
            closed_at: null,
          },
          {
            working_section_id: null,
            closed_at: null,
          },
          {
            working_section_id: "ws_2",
            closed_at: "2026-05-24T00:00:00.000Z",
          },
        ] as never}
      />,
    );

    expect(screen.getByTestId("working-sections-assigned-count")).toHaveTextContent(
      "2 assigned",
    );
    expect(
      screen.getByTestId("working-sections-completed-count"),
    ).toHaveTextContent("1 completed");
  });

  it("shows zero counts when task steps are empty", () => {
    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={vi.fn()}
        taskSteps={[]}
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

    render(
      <TaskWorkingSectionsField
        onOpenWorkingSections={onOpenWorkingSections}
        taskSteps={[]}
      />,
    );
    await user.click(screen.getByTestId("task-working-sections-field"));

    expect(onOpenWorkingSections).toHaveBeenCalledTimes(1);
  });
});
