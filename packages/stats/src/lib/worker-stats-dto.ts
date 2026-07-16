import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  type StepState,
} from "@beyo/tasks";
import type { StatePillVariant } from "@beyo/ui";

import { secondsToHM } from "./format-duration";
import { isKnownInsight, resolveInsightCopy, type ResolvedInsight } from "./insight-copy";
import type {
  RunningTotals,
  WorkerInsight,
  WorkerLastStep,
  WorkerStatsRow,
} from "../types";

export type TickerModel = {
  offsetSeconds: number;
  startedAtIso: string;
};

// A daily total column. When intervals are open in that state it ticks:
// display = offsetSeconds + ratePerSecond × (now − asOf). offsetSeconds is the
// live value at `asOf` (settled + running); ratePerSecond is the open-interval
// count (can be > 1 — e.g. stacked open pauses).
export type LiveTotal =
  | { kind: "static"; seconds: number }
  | {
      kind: "ticking";
      offsetSeconds: number;
      ratePerSecond: number;
      asOfIso: string;
    };

function resolveLiveTotal(
  settledSeconds: number,
  runningSeconds: number,
  openCount: number,
  asOfIso: string,
): LiveTotal {
  const liveSeconds = settledSeconds + runningSeconds;

  if (openCount > 0) {
    return {
      kind: "ticking",
      offsetSeconds: liveSeconds,
      ratePerSecond: openCount,
      asOfIso,
    };
  }

  return { kind: "static", seconds: liveSeconds };
}

export type WorkerStatsCardViewModel = {
  userId: string;
  username: string;
  profilePicture: string | null;
  hasStep: boolean;
  // Task of the last-interacted step, for opening its detail page. Null when the
  // worker has no last active step.
  taskId: string | null;
  stepState: StepState | null;
  stepStateLabel: string | null;
  stepStateVariant: StatePillVariant | null;
  articleLabel: string | null;
  workingSectionName: string | null;
  // Free-text reason the step is paused; populated only when the last step is
  // paused and carries a reason. Drives the "Paused because: …" row.
  pauseReason: string | null;
  ticker: TickerModel | null;
  workingTotal: LiveTotal;
  pausedTotal: LiveTotal;
  completedCount: number;
  // Known-code insights in server (strongest-first) order; drives the sheet.
  insights: WorkerInsight[];
  // Resolved copy for the top insight; drives the card band. null when none.
  topInsight: ResolvedInsight | null;
};

export function resolveTicker(step: WorkerLastStep | null): TickerModel | null {
  if (!step?.last_state_record) {
    return null;
  }

  // Only the time-bearing states have a live open interval to tick.
  const isTimeBearing =
    step.state === "working" ||
    step.state === "paused" ||
    step.state === "ended_shift";

  if (!isTimeBearing) {
    return null;
  }

  return {
    // Elapsed time since the current state was entered (the open interval) —
    // not the step's accumulated total.
    offsetSeconds: 0,
    startedAtIso: step.last_state_record.entered_at,
  };
}

export function toWorkerStatsCardViewModel(
  row: WorkerStatsRow,
): WorkerStatsCardViewModel {
  const step = row.last_interacted_step;
  const item = step?.item ?? null;
  const insights = row.insights.filter(isKnownInsight);
  const running: RunningTotals = row.running;

  return {
    userId: row.user.client_id,
    username: row.user.username,
    profilePicture: row.user.profile_picture,
    hasStep: step !== null,
    taskId: step?.task_id ?? null,
    stepState: step?.state ?? null,
    stepStateLabel: step ? humanizeStepState(step.state) : null,
    stepStateVariant: step ? STEP_STATE_VARIANT[step.state] : null,
    articleLabel: item?.article_number
      ? `#${item.article_number}`
      : (item?.sku ?? null),
    workingSectionName: step?.working_section_name_snapshot ?? null,
    pauseReason:
      step?.state === "paused"
        ? (step.last_state_record?.reason?.trim() || null)
        : null,
    ticker: resolveTicker(step),
    workingTotal: resolveLiveTotal(
      row.daily_stats.total_working_seconds,
      running.working_seconds,
      running.working_open_count,
      running.as_of,
    ),
    pausedTotal: resolveLiveTotal(
      row.daily_stats.total_pause_seconds,
      running.pause_seconds,
      running.pause_open_count,
      running.as_of,
    ),
    completedCount: row.daily_stats.total_completed_count,
    insights,
    topInsight: resolveInsightCopy(insights[0]),
  };
}

// Snapshot text for a live total at its `asOf` instant (used where a ticking
// component can't render, e.g. static surface props / passthrough).
export function liveTotalToText(total: LiveTotal): string {
  return secondsToHM(
    total.kind === "static" ? total.seconds : total.offsetSeconds,
  );
}
