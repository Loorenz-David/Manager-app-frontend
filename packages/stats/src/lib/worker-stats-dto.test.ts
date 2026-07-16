import { describe, expect, it } from "vitest";

import { resolveTicker, toWorkerStatsCardViewModel } from "./worker-stats-dto";
import type { WorkerStatsRow } from "../types";

function makeRow(overrides: Partial<WorkerStatsRow> = {}): WorkerStatsRow {
  return {
    user: {
      client_id: "usr_test",
      username: "#test-seller",
      profile_picture: null,
      last_online: null,
    },
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
    insights: [],
    ...overrides,
  };
}

describe("worker stats DTO", () => {
  it("maps the worker card fields and live working ticker", () => {
    const viewModel = toWorkerStatsCardViewModel(makeRow());

    expect(viewModel).toMatchObject({
      userId: "usr_test",
      username: "#test-seller",
      stepState: "working",
      stepStateLabel: "Working",
      stepStateVariant: "active",
      articleLabel: "#ART-40921",
      workingSectionName: "Upholstery",
      workingTotal: { kind: "static", seconds: 26_040 },
      pausedTotal: { kind: "static", seconds: 5_040 },
      completedCount: 12,
      // Ticks the current open interval from zero, not the step's accumulated total.
      ticker: {
        offsetSeconds: 0,
        startedAtIso: "2026-07-15T12:00:00Z",
      },
    });
  });

  it("makes a total tick when intervals are open, adding running on top of settled", () => {
    const viewModel = toWorkerStatsCardViewModel(
      makeRow({
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

    // Both columns can be open at once (active working + stacked auto-pauses).
    expect(viewModel.workingTotal).toEqual({
      kind: "ticking",
      offsetSeconds: 26_040 + 60,
      ratePerSecond: 1,
      asOfIso: "2026-07-16T12:00:00Z",
    });
    expect(viewModel.pausedTotal).toEqual({
      kind: "ticking",
      offsetSeconds: 5_040 + 900,
      ratePerSecond: 3,
      asOfIso: "2026-07-16T12:00:00Z",
    });
  });

  it("ticks the open interval from zero for every time-bearing state", () => {
    for (const state of ["working", "paused", "ended_shift"] as const) {
      const row = makeRow({
        last_interacted_step: {
          ...makeRow().last_interacted_step!,
          state,
        },
      });

      expect(resolveTicker(row.last_interacted_step)).toEqual({
        offsetSeconds: 0,
        startedAtIso: "2026-07-15T12:00:00Z",
      });
    }
  });

  it("surfaces the free-text pause reason only when paused", () => {
    const pausedWithReason = makeRow({
      last_interacted_step: {
        ...makeRow().last_interacted_step!,
        state: "paused",
        last_state_record: {
          entered_at: "2026-07-15T12:00:00Z",
          reason: "  Waiting for upholstery  ",
        },
      },
    });
    const workingWithReason = makeRow({
      last_interacted_step: {
        ...makeRow().last_interacted_step!,
        state: "working",
        last_state_record: {
          entered_at: "2026-07-15T12:00:00Z",
          reason: "irrelevant",
        },
      },
    });

    expect(toWorkerStatsCardViewModel(pausedWithReason).pauseReason).toBe(
      "Waiting for upholstery",
    );
    expect(
      toWorkerStatsCardViewModel(workingWithReason).pauseReason,
    ).toBeNull();
    expect(toWorkerStatsCardViewModel(makeRow()).pauseReason).toBeNull();
  });

  it("has no ticker for a non-time-bearing state or a step without a state record", () => {
    const completed = makeRow({
      last_interacted_step: {
        ...makeRow().last_interacted_step!,
        state: "completed",
      },
    });
    const noRecord = makeRow({
      last_interacted_step: {
        ...makeRow().last_interacted_step!,
        last_state_record: null,
      },
    });

    expect(resolveTicker(completed.last_interacted_step)).toBeNull();
    expect(resolveTicker(noRecord.last_interacted_step)).toBeNull();
  });

  it("filters unknown insight codes and resolves the top insight, preserving order", () => {
    const viewModel = toWorkerStatsCardViewModel(
      makeRow({
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
        ],
      }),
    );

    expect(viewModel.insights.map((i) => i.code)).toEqual([
      "completion_surge",
      "rising_pauses",
    ]);
    expect(viewModel.topInsight).toMatchObject({
      title: "Completion surge — 5 more than usual",
      rightValue: "8 vs 3",
      tone: "positive",
    });
  });

  it("has no top insight when the list is empty", () => {
    const viewModel = toWorkerStatsCardViewModel(makeRow({ insights: [] }));
    expect(viewModel.insights).toEqual([]);
    expect(viewModel.topInsight).toBeNull();
  });

  it("renders an idle worker without step-specific values", () => {
    const viewModel = toWorkerStatsCardViewModel(
      makeRow({ last_interacted_step: null }),
    );

    expect(viewModel).toMatchObject({
      hasStep: false,
      stepState: null,
      articleLabel: null,
      ticker: null,
      workingTotal: { kind: "static", seconds: 26_040 },
      pausedTotal: { kind: "static", seconds: 5_040 },
      completedCount: 12,
    });
  });
});
