import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TaskBudgetOverrunBand } from "./TaskBudgetOverrunBand";
import { TaskBudgetSignalFooter } from "./TaskBudgetSignalFooter";

describe("TaskBudgetOverrunBand", () => {
  afterEach(cleanup);

  it("renders the overrun label", () => {
    render(
      <TaskBudgetOverrunBand
        signal={{
          tone: "over",
          label: "Over budget by 1h 25m",
          costLabel: "567 kr",
        }}
      />,
    );

    expect(screen.getByText("Over budget by 1h 25m")).toBeInTheDocument();
  });

  it("renders the supplied cost label", () => {
    render(
      <TaskBudgetOverrunBand
        signal={{
          tone: "over",
          label: "Over budget by 1h 25m",
          costLabel: "567 kr",
        }}
      />,
    );

    expect(screen.getByText("567 kr")).toBeInTheDocument();
  });

  it("uses the amber projected-over tone", () => {
    render(
      <TaskBudgetOverrunBand
        signal={{
          tone: "projected_over",
          label: "Projected over budget by 20m",
          costLabel: "90 kr",
        }}
      />,
    );

    expect(screen.getByTestId("task-budget-overrun-band")).toHaveClass(
      "bg-[#fff4d6]",
      "text-[#8a6d1c]",
    );
  });

  it("renders a live footer without requiring the task-list parent to tick", () => {
    render(
      <TaskBudgetSignalFooter
        receivedAtMs={Date.now()}
        signal={{
          task_id: "tsk_one",
          budget_state: "over",
          over_seconds: 60,
          over_cost_minor: 375,
          projected_over_seconds: 0,
          projected_over_cost_minor: 0,
          currency: "swedish_krona",
          allowed_seconds: 3_000,
          actual_worked_seconds: 3_060,
          cost_per_worker_minute_ten_thousandths: 37_500,
        }}
      />,
    );

    expect(screen.getByText("Over budget by 1m")).toBeInTheDocument();
    expect(screen.getByText("3,75 kr")).toBeInTheDocument();
  });
});
