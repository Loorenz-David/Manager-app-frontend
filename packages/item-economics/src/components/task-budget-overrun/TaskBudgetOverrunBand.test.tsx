import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TaskBudgetOverrunBand } from "./TaskBudgetOverrunBand";

describe("TaskBudgetOverrunBand", () => {
  afterEach(cleanup);

  it("renders the overrun label", () => {
    render(
      <TaskBudgetOverrunBand
        overrun={{ overrunSeconds: 5100, label: "Over budget by 1h 25m" }}
      />,
    );

    expect(screen.getByText("Over budget by 1h 25m")).toBeInTheDocument();
  });

  it("renders the cost label when supplied", () => {
    render(
      <TaskBudgetOverrunBand
        costLabel="567 kr"
        overrun={{ overrunSeconds: 5100, label: "Over budget by 1h 25m" }}
      />,
    );

    expect(screen.getByText("567 kr")).toBeInTheDocument();
  });

  it("omits the cost slot when no cost label is supplied", () => {
    render(
      <TaskBudgetOverrunBand
        overrun={{ overrunSeconds: 1200, label: "Over budget by 20m" }}
      />,
    );

    expect(screen.queryByText(/kr$/)).not.toBeInTheDocument();
  });
});
