import { describe, expect, it } from "vitest";

import {
  resolveTicker,
  toWorkerInsightsSectionViewModel,
  toWorkerStepSectionViewModel,
  toWorkerTimelineSectionViewModel,
} from "./worker-stats-dto";
import type {
  WorkerInsightsRow,
  WorkerLastStepRow,
  WorkerLinearTimelineRow,
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

function makeTimelineRow(
  timeline: Partial<WorkerLinearTimelineRow["timeline"]> = {},
): WorkerLinearTimelineRow {
  return {
    user,
    timeline: {
      date_from: "2026-07-15",
      date_to: "2026-07-15",
      working_seconds: 26_040,
      pause_seconds: 5_040,
      ended_shift_seconds: 0,
      idle_seconds: 600,
      completed_count: 12,
      pause_by_reason: { pause_lunch_break: 5_040 },
      ...timeline,
    },
  };
}

describe("worker stats DTO", () => {
  it("maps the step section and its live step ticker", () => {
    expect(toWorkerStepSectionViewModel(makeStepRow())).toMatchObject({
      hasStep: true,
      stepState: "working",
      stepStateLabel: "Working",
      stepStateVariant: "active",
      articleLabel: "#ART-40921",
      workingSectionName: "Upholstery",
      // Anchors to the step's state-entry time, not fetch time, so the settled
      // total plus the open interval survives reloads/rerenders.
      ticker: { offsetSeconds: 120, startedAtIso: "2026-07-15T12:00:00Z" },
    });
  });

  it("maps the linear-timeline wall-clock partition to static seconds", () => {
    const viewModel = toWorkerTimelineSectionViewModel(
      makeTimelineRow({
        working_seconds: 26_040,
        pause_seconds: 5_040,
        idle_seconds: 600,
        completed_count: 12,
      }),
    );

    expect(viewModel).toEqual({
      workingSeconds: 26_040,
      pausedSeconds: 5_040,
      idleSeconds: 600,
      completedCount: 12,
    });
  });

  it("keeps ticker rules for paused and ended-shift steps", () => {
    const paused = {
      ...makeStepRow().last_interacted_step!,
      state: "paused" as const,
    };
    expect(resolveTicker(paused)).toEqual({
      offsetSeconds: 30,
      startedAtIso: "2026-07-15T12:00:00Z",
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
