import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkerTimeQualityPanel } from "./WorkerTimeQualityPanel";
import type { WorkerTimeQualityPanelProps } from "./WorkerTimeQualityPanel";
import { cycleTimeStrategy } from "../lib/time-quality";

afterEach(cleanup);

function renderPanel(overrides: Partial<WorkerTimeQualityPanelProps> = {}) {
  const onCycleStrategy = vi.fn();
  render(
    <WorkerTimeQualityPanel
      canCycle
      fillDisplay="0h 30m"
      flaggedCount={3}
      mode="median"
      wastedDisplay="2h 40m"
      onCycleStrategy={onCycleStrategy}
      {...overrides}
    />,
  );
  return { onCycleStrategy };
}

describe("WorkerTimeQualityPanel", () => {
  it("renders flagged count, wasted, fill, and the mode label", () => {
    renderPanel();

    expect(screen.getByTestId("worker-time-quality-flagged")).toHaveTextContent("3");
    expect(screen.getByTestId("worker-time-quality-wasted")).toHaveTextContent("2h 40m");
    expect(screen.getByTestId("worker-time-quality-fill-value")).toHaveTextContent("0h 30m");
    expect(screen.getByTestId("worker-time-quality-strategy")).toHaveTextContent("Median");
  });

  it("cycles when the fill column is tapped", async () => {
    const user = userEvent.setup();
    const { onCycleStrategy } = renderPanel();

    await user.click(screen.getByTestId("worker-time-quality-fill"));

    expect(onCycleStrategy).toHaveBeenCalledOnce();
  });

  it("shows the off mode with no fill value, but stays cyclable", async () => {
    const user = userEvent.setup();
    // Under `none` the page passes fillDisplay=null: nothing is being added.
    const { onCycleStrategy } = renderPanel({ mode: "none", fillDisplay: null });

    expect(screen.getByTestId("worker-time-quality-strategy")).toHaveTextContent("Off");
    expect(screen.getByTestId("worker-time-quality-fill-value")).toHaveTextContent("—");
    // Wasted is still meaningful with the fill switched off.
    expect(screen.getByTestId("worker-time-quality-wasted")).toHaveTextContent("2h 40m");

    // Critical: the control must not strand the user in a mode they can't leave.
    expect(screen.getByTestId("worker-time-quality-fill")).toBeEnabled();
    await user.click(screen.getByTestId("worker-time-quality-fill"));
    expect(onCycleStrategy).toHaveBeenCalledOnce();
  });

  it("hides time values and disables cycling when there is no time state", async () => {
    const user = userEvent.setup();
    const { onCycleStrategy } = renderPanel({
      canCycle: false,
      fillDisplay: null,
      wastedDisplay: null,
    });

    expect(screen.getByTestId("worker-time-quality-wasted")).toHaveTextContent("—");
    expect(screen.getByTestId("worker-time-quality-fill-value")).toHaveTextContent("—");
    expect(screen.getByTestId("worker-time-quality-fill")).toBeDisabled();

    await user.click(screen.getByTestId("worker-time-quality-fill"));
    expect(onCycleStrategy).not.toHaveBeenCalled();
  });
});

describe("cycleTimeStrategy", () => {
  it("cycles median → mean → iqr → off → median", () => {
    expect(cycleTimeStrategy("median")).toBe("mean");
    expect(cycleTimeStrategy("mean")).toBe("iqr");
    expect(cycleTimeStrategy("iqr")).toBe("none");
    // Returns to a real strategy — the cycle is closed, never a dead end.
    expect(cycleTimeStrategy("none")).toBe("median");
  });
});
