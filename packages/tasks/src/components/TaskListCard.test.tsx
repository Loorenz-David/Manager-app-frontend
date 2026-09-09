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

describe("TaskListCard date display", () => {
  it("shows the ready-by date when no date is supplied", () => {
    render(
      <TaskListCard
        imageUrl={null}
        item={null}
        taskId="task-default"
        task={{
          task_type: "return",
          state: "working",
          return_source: null,
          ready_by_at: "2026-05-30",
        }}
      />,
    );

    expect(screen.getByText("30-05-2026")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ready by" })).toBeInTheDocument();
  });

  it("shows the completion date instead of the ready-by date for a ready task", () => {
    render(
      <TaskListCard
        dateDisplay={{ kind: "completed", at: "2026-08-15T10:00:00.000Z" }}
        imageUrl={null}
        item={null}
        taskId="task-ready"
        task={{
          task_type: "return",
          state: "ready",
          return_source: null,
          ready_by_at: "2026-05-30",
        }}
      />,
    );

    expect(screen.getByText("15-08-2026")).toBeInTheDocument();
    expect(screen.queryByText("30-05-2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("names each date kind for readers who cannot see the icon", () => {
    const { rerender } = render(
      <TaskListCard
        dateDisplay={{ kind: "completed", at: "2026-08-15T10:00:00.000Z" }}
        imageUrl={null}
        item={null}
        taskId="task-kind"
        task={{
          task_type: "return",
          state: "ready",
          return_source: null,
          ready_by_at: null,
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Completed" })).toBeInTheDocument();

    rerender(
      <TaskListCard
        dateDisplay={{ kind: "closed", at: "2026-08-16T10:00:00.000Z" }}
        imageUrl={null}
        item={null}
        taskId="task-kind"
        task={{
          task_type: "return",
          state: "resolved",
          return_source: null,
          ready_by_at: null,
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Resolved" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Completed" }),
    ).not.toBeInTheDocument();
  });

  it("renders no date row when the task has no date of that kind", () => {
    render(
      <TaskListCard
        dateDisplay={{ kind: "completed", at: null }}
        imageUrl={null}
        item={null}
        taskId="task-no-completion"
        task={{
          task_type: "return",
          state: "ready",
          return_source: null,
          ready_by_at: "2026-05-30",
        }}
      />,
    );

    expect(screen.queryByText("30-05-2026")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Completed" })).not.toBeInTheDocument();
  });

  it("keeps the countdown on an overdue task showing its ready-by date", () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);

    render(
      <TaskListCard
        dateDisplay={{ kind: "ready_by", at: overdueDate.toISOString() }}
        imageUrl={null}
        item={null}
        taskId="task-overdue"
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
