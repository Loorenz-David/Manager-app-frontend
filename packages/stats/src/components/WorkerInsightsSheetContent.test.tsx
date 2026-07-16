import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorkerInsightsSheetContent } from "./WorkerInsightsSheetContent";
import type { WorkerInsight } from "../types";

const insights: WorkerInsight[] = [
  {
    code: "completion_surge",
    polarity: "positive",
    metric: "completed_count",
    target_value: 8,
    baseline_value: 3,
    delta: 5,
    delta_pct: 1.667,
    sample_size: 4,
    severity: "high",
  },
  {
    code: "rising_pauses",
    polarity: "negative",
    metric: "avg_pause_seconds",
    target_value: 660,
    baseline_value: 300,
    delta: 360,
    delta_pct: 1.2,
    sample_size: 3,
    severity: "medium",
  },
];

describe("WorkerInsightsSheetContent", () => {
  afterEach(cleanup);

  it("lists each insight with its title, value, and explanation", () => {
    render(<WorkerInsightsSheetContent insights={insights} />);

    expect(
      screen.getByText("Completion surge — 5 more than usual"),
    ).toBeInTheDocument();
    expect(screen.getByText("8 vs 3")).toBeInTheDocument();
    expect(screen.getByText("Idle longer than usual")).toBeInTheDocument();
    expect(screen.getByText("2.2× baseline")).toBeInTheDocument();
    // sample-size honesty note
    expect(
      screen.getByText(/vs their last 4 same-weekdays/),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no insights", () => {
    render(<WorkerInsightsSheetContent insights={[]} />);
    expect(screen.getByText("No insights for today.")).toBeInTheDocument();
  });
});
