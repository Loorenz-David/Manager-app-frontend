import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkerStatsCard } from "./WorkerStatsCard";
import type { WorkerStatsCardViewModel } from "../lib/worker-stats-dto";
import type { WorkerInsight } from "../types";

const surgeInsight: WorkerInsight = {
  code: "completion_surge",
  polarity: "positive",
  metric: "completed_count",
  target_value: 8,
  baseline_value: 3,
  delta: 5,
  delta_pct: 1.667,
  sample_size: 4,
  severity: "high",
};

const activeWorker: WorkerStatsCardViewModel = {
  userId: "usr_test",
  username: "#test-seller",
  profilePicture: null,
  step: {
    status: "ready",
    data: {
      hasStep: true,
      taskId: "tsk_test",
      stepState: "working",
      stepStateLabel: "Working",
      stepStateVariant: "active",
      articleLabel: "#ART-40921",
      workingSectionName: "Upholstery",
      pauseReason: null,
      ticker: {
        offsetSeconds: 0,
        startedAtIso: new Date().toISOString(),
      },
    },
  },
  totals: {
    status: "ready",
    data: {
      workingTotal: { kind: "static", seconds: 26_040 },
      pausedTotal: { kind: "static", seconds: 5_040 },
      completedCount: 12,
    },
  },
  insights: { status: "ready", data: { insights: [], topInsight: null } },
};

function getStepData(worker: WorkerStatsCardViewModel) {
  if (worker.step.status !== "ready" || !worker.step.data) {
    throw new Error("test worker step is not ready");
  }
  return worker.step.data;
}

function getTotalsData(worker: WorkerStatsCardViewModel) {
  if (worker.totals.status !== "ready" || !worker.totals.data) {
    throw new Error("test worker totals are not ready");
  }
  return worker.totals.data;
}

describe("WorkerStatsCard", () => {
  afterEach(cleanup);

  it("renders the visual hierarchy from the worker stats card design", () => {
    render(<WorkerStatsCard worker={activeWorker} />);

    expect(screen.getByText("#test-seller")).toBeInTheDocument();
    expect(screen.getByText("#ART-40921")).toBeInTheDocument();
    expect(screen.getByText(/Upholstery/)).toBeInTheDocument();
    expect(screen.getByTestId("worker-stats-timer-usr_test")).toBeInTheDocument();
    expect(screen.getByTestId("worker-stats-working-usr_test")).toHaveTextContent("7h 14m");
    expect(screen.getByTestId("worker-stats-paused-usr_test")).toHaveTextContent("1h 24m");
    expect(screen.getByTestId("worker-stats-completed-usr_test")).toHaveTextContent("12");
  });

  it("keeps the daily footer when the worker has no interacted step", () => {
    render(
      <WorkerStatsCard
        worker={{
          ...activeWorker,
          step: {
            status: "ready",
            data: {
              ...getStepData(activeWorker),
              hasStep: false,
              stepState: null,
              stepStateLabel: null,
              stepStateVariant: null,
              articleLabel: null,
              ticker: null,
            },
          },
        }}
      />,
    );

    expect(screen.queryByTestId("worker-stats-timer-usr_test")).not.toBeInTheDocument();
    expect(screen.getByTestId("worker-stats-completed-usr_test")).toHaveTextContent("12");
  });

  it("renders no insight band when there is no top insight", () => {
    render(<WorkerStatsCard worker={activeWorker} />);
    expect(
      screen.queryByTestId("worker-stats-insight-usr_test"),
    ).not.toBeInTheDocument();
  });

  it("renders the top insight band and opens insights on tap", async () => {
    const user = userEvent.setup();
    const onOpenInsights = vi.fn();

    render(
      <WorkerStatsCard
        worker={{
          ...activeWorker,
          insights: {
            status: "ready",
            data: {
              insights: [surgeInsight],
              topInsight: {
                code: "completion_surge",
                title: "Completion surge — 5 more than usual",
                rightValue: "8 vs 3",
                tone: "positive",
              },
            },
          },
        }}
        onOpenInsights={onOpenInsights}
      />,
    );

    const band = screen.getByTestId("worker-stats-insight-usr_test");
    expect(band).toHaveTextContent("Completion surge — 5 more than usual");
    expect(band).toHaveTextContent("8 vs 3");

    await user.click(band);
    expect(onOpenInsights).toHaveBeenCalledWith([surgeInsight]);
  });

  it("renders the pause reason row when the worker is paused with a reason", () => {
    render(
      <WorkerStatsCard
        worker={{
          ...activeWorker,
          step: {
            status: "ready",
            data: {
              ...getStepData(activeWorker),
              pauseReason: "Waiting for upholstery",
            },
          },
        }}
      />,
    );

    const row = screen.getByTestId("worker-stats-pause-reason-usr_test");
    expect(row).toHaveTextContent("Waiting for upholstery");
  });

  it("omits the pause reason row when there is no reason", () => {
    render(<WorkerStatsCard worker={activeWorker} />);
    expect(
      screen.queryByTestId("worker-stats-pause-reason-usr_test"),
    ).not.toBeInTheDocument();
  });

  it("renders a live ticking total when a state has open intervals", () => {
    render(
      <WorkerStatsCard
        worker={{
          ...activeWorker,
          totals: {
            status: "ready",
            data: {
              ...getTotalsData(activeWorker),
              pausedTotal: {
                kind: "ticking",
                offsetSeconds: 5_040,
                ratePerSecond: 1,
                asOfIso: new Date().toISOString(),
              },
            },
          },
        }}
      />,
    );

    // Static column stays a plain value; open column mounts the live ticker.
    expect(
      screen.queryByTestId("worker-stats-working-usr_test-timer"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("worker-stats-paused-usr_test-timer"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("worker-stats-paused-usr_test"),
    ).toHaveTextContent("1h 24m");
  });

  it("opens the last step's task detail on body tap", async () => {
    const user = userEvent.setup();
    const onOpenTaskDetail = vi.fn();

    render(
      <WorkerStatsCard worker={activeWorker} onOpenTaskDetail={onOpenTaskDetail} />,
    );

    await user.click(screen.getByTestId("worker-stats-card-body-usr_test"));
    expect(onOpenTaskDetail).toHaveBeenCalledWith("tsk_test");
  });

  it("passes a null task id on body tap when there is no last step", async () => {
    const user = userEvent.setup();
    const onOpenTaskDetail = vi.fn();

    render(
      <WorkerStatsCard
        worker={{
          ...activeWorker,
          step: {
            status: "ready",
            data: { ...getStepData(activeWorker), hasStep: false, taskId: null },
          },
        }}
        onOpenTaskDetail={onOpenTaskDetail}
      />,
    );

    await user.click(screen.getByTestId("worker-stats-card-body-usr_test"));
    expect(onOpenTaskDetail).toHaveBeenCalledWith(null);
  });
});
