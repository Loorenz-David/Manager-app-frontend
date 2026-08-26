import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TaskListCard } from "./TaskListCard";

afterEach(() => {
  cleanup();
});

describe("TaskListCard deadline status", () => {
  it.each(["ready", "resolved", "failed", "cancelled"] as const)(
    "does not show overdue for %s tasks",
    (state) => {
      render(
        <TaskListCard
          imageUrl={null}
          item={null}
          taskId={`task-${state}`}
          task={{
            task_type: "return",
            state,
            return_source: null,
            ready_by_at: "2020-01-01",
          }}
        />,
      );

      expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    },
  );

  it("shows overdue for an active task past its ready-by date", () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);

    render(
      <TaskListCard
        imageUrl={null}
        item={null}
        taskId="task-active"
        task={{
          task_type: "return",
          state: "working",
          return_source: null,
          ready_by_at: overdueDate.toISOString(),
        }}
      />,
    );

    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });
});
