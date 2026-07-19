import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkerTotalsSelector } from "./WorkerTotalsSelector";

afterEach(cleanup);

function renderSelector(active: "working" | "paused" | "completed") {
  const onSelect = vi.fn();
  render(
    <WorkerTotalsSelector
      active={active}
      completedCount={12}
      pausedDisplay="1h 24m"
      workingDisplay="7h 14m"
      onSelect={onSelect}
    />,
  );
  return { onSelect };
}

describe("WorkerTotalsSelector", () => {
  it("renders each total and marks the active tab selected", () => {
    renderSelector("paused");

    expect(screen.getByText("Worked")).toBeInTheDocument();
    expect(screen.getByText("7h 14m")).toBeInTheDocument();
    expect(screen.getByText("1h 24m")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    expect(
      screen.getByTestId("worker-granularity-tab-paused"),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByTestId("worker-granularity-tab-working"),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the tapped intention", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSelector("working");

    await user.click(screen.getByTestId("worker-granularity-tab-completed"));

    expect(onSelect).toHaveBeenCalledWith("completed");
  });
});
