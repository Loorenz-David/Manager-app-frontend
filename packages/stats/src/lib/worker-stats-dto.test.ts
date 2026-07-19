import { describe, expect, it } from "vitest";

import {
  resolveTicker,
  toWorkerInsightsSectionViewModel,
  toWorkerStepSectionViewModel,
  toWorkerTotalsSectionViewModel,
} from "./worker-stats-dto";
import type {
  WorkerInsightsRow,
  WorkerLastStepRow,
  WorkerTotalsRow,
} from "../types";

const user = {
  client_id: "usr_test",
  username: "#test-seller",
  profile_picture: null,
  last_online: null,
};

function makeStepRow(
  overrides: Partial<WorkerLastStepRow> = {},
): WorkerLastStepRow {
  return {
    user,
    last_interacted_step: {
      client_id: "tsp_test",
      state: "working",
      working_section_id: "wsc_test",
      working_section_name_snapshot: "Upholstery",
      item: { article_number: "ART-40921", sku: "SKU-1" },
      last_state_record: { entered_at: "2026-07-15T12:00:00Z" },
      total_working_seconds: 120,
      total_pause_seconds: 30,
      total_ended_shift_seconds: 45,
    },
    batch: null,
    ...overrides,
  };
}

function makeTotalsRow(
  overrides: Partial<WorkerTotalsRow> = {},
): WorkerTotalsRow {
  return {
    user,
    daily_stats: {
      work_date: "2026-07-15",
      total_working_seconds: 26_040,
      total_pause_seconds: 5_040,
      total_completed_count: 12,
    },
    running: {
      working_seconds: 0,
      pause_seconds: 0,
      ended_shift_seconds: 0,
      working_open_count: 0,
      pause_open_count: 0,
      ended_shift_open_count: 0,
      as_of: "2026-07-15T12:00:00Z",
    },
    ...overrides,
  };
}

describe("worker stats DTO", () => {
  it("maps the step section and its live step ticker", () => {
    expect(
      toWorkerStepSectionViewModel(
        makeStepRow(),
        "2026-07-15T13:00:00Z",
      ),
    ).toMatchObject({
      hasStep: true,
      stepState: "working",
      stepStateLabel: "Working",
      stepStateVariant: "active",
      articleLabel: "#ART-40921",
      workingSectionName: "Upholstery",
      ticker: { offsetSeconds: 120, startedAtIso: "2026-07-15T13:00:00Z" },
    });
  });

  it("maps settled and running totals with one-second ticking", () => {
    const viewModel = toWorkerTotalsSectionViewModel(
      makeTotalsRow({
        running: {
          working_seconds: 60,
          pause_seconds: 900,
          ended_shift_seconds: 0,
          working_open_count: 1,
          pause_open_count: 3,
          ended_shift_open_count: 0,
          as_of: "2026-07-16T12:00:00Z",
        },
      }),
    );

    expect(viewModel.workingTotal).toEqual({
      kind: "ticking",
      offsetSeconds: 26_100,
      ratePerSecond: 1,
      asOfIso: "2026-07-16T12:00:00Z",
    });
    expect(viewModel.pausedTotal).toEqual({
      kind: "ticking",
      offsetSeconds: 5_940,
      ratePerSecond: 1,
      asOfIso: "2026-07-16T12:00:00Z",
    });
  });

  it("folds the estimated fill into usable totals and ignores wasted", () => {
    const viewModel = toWorkerTotalsSectionViewModel(
      makeTotalsRow({
        daily_stats: {
          date_from: "2026-07-01",
          date_to: "2026-07-15",
          total_working_seconds: 26_040,
          total_pause_seconds: 5_040,
          total_completed_count: 12,
          time_quality: {
            strategy: "median",
            working: {
              trusted: 26_040,
              wasted: 9_600,
              inaccurate_step_count: 3,
              estimated_fill: 1_800.4,
            },
            paused: {
              trusted: 5_040,
              wasted: 600,
              inaccurate_step_count: 3,
              estimated_fill: 299.6,
            },
          },
        },
      }),
    );

    // trusted + round(fill); wasted must never be added.
    expect(viewModel.workingTotal).toEqual({ kind: "static", seconds: 27_840 });
    expect(viewModel.pausedTotal).toEqual({ kind: "static", seconds: 5_340 });
  });

  it("keeps ticker rules for paused and ended-shift steps", () => {
    const paused = {
      ...makeStepRow().last_interacted_step!,
      state: "paused" as const,
    };
    expect(resolveTicker(paused, "2026-07-15T13:00:00Z")).toEqual({
      offsetSeconds: 30,
      startedAtIso: "2026-07-15T13:00:00Z",
    });

    const endedShift = { ...paused, state: "ended_shift" as const };
    expect(resolveTicker(endedShift)).toEqual({
      offsetSeconds: 0,
      startedAtIso: "2026-07-15T12:00:00Z",
    });
  });

  it("filters unknown insight codes and resolves the top insight", () => {
    const row: WorkerInsightsRow = {
      user,
      insights: [
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
          code: "future_unknown_code",
          polarity: "negative",
          metric: "whatever",
          target_value: 1,
          baseline_value: 1,
          delta: 0,
          delta_pct: null,
          sample_size: 3,
          severity: "low",
        },
      ],
    };

    expect(toWorkerInsightsSectionViewModel(row)).toMatchObject({
      insights: [{ code: "completion_surge" }],
      topInsight: { tone: "positive" },
    });
  });
});
