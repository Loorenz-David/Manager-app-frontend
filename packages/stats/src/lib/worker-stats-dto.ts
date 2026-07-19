import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  type StepState,
} from "@beyo/tasks";
import type { StatePillVariant } from "@beyo/ui";

import { secondsToHM } from "./format-duration";
import { fillToSeconds } from "./time-quality";
import {
  isKnownInsight,
  resolveInsightCopy,
  type ResolvedInsight,
} from "./insight-copy";
import type {
  WorkerInsightsRow,
  WorkerLastStep,
  WorkerLastStepRow,
  WorkerStatsUser,
  WorkerTotalsRow,
} from "../types";

export type TickerModel = {
  offsetSeconds: number;
  startedAtIso: string;
};

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
      ratePerSecond: 1,
      asOfIso,
    };
  }

  return { kind: "static", seconds: liveSeconds };
}

export type SectionState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T | null }
  | { status: "error" };

export type WorkerStepSectionViewModel = {
  hasStep: boolean;
  taskId: string | null;
  stepState: StepState | null;
  stepStateLabel: string | null;
  stepStateVariant: StatePillVariant | null;
  articleLabel: string | null;
  workingSectionName: string | null;
  pauseReason: string | null;
  ticker: TickerModel | null;
};

export type WorkerTotalsSectionViewModel = {
  workingTotal: LiveTotal;
  pausedTotal: LiveTotal;
  completedCount: number;
};

export type WorkerInsightsSectionViewModel = {
  insights: WorkerInsightsRow["insights"];
  topInsight: ResolvedInsight | null;
};

export type WorkerStatsCardViewModel = {
  userId: string;
  username: string;
  profilePicture: string | null;
  step: SectionState<WorkerStepSectionViewModel>;
  totals: SectionState<WorkerTotalsSectionViewModel>;
  insights: SectionState<WorkerInsightsSectionViewModel>;
};

export function resolveTicker(
  step: WorkerLastStep | null,
  obtainedAtIso = new Date().toISOString(),
): TickerModel | null {
  if (!step?.last_state_record) {
    return null;
  }

  if (step.state === "working") {
    return {
      offsetSeconds: step.total_working_seconds,
      startedAtIso: obtainedAtIso,
    };
  }

  if (step.state === "paused") {
    return {
      offsetSeconds: step.total_pause_seconds,
      startedAtIso: obtainedAtIso,
    };
  }

  if (step.state !== "ended_shift") {
    return null;
  }

  return {
    offsetSeconds: 0,
    startedAtIso: step.last_state_record.entered_at,
  };
}

export function toWorkerStepSectionViewModel(
  row: WorkerLastStepRow,
  obtainedAtIso = new Date().toISOString(),
): WorkerStepSectionViewModel {
  const step = row.last_interacted_step;
  const item = step?.item ?? null;

  return {
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
    ticker: resolveTicker(step, obtainedAtIso),
  };
}

export function toWorkerTotalsSectionViewModel(
  row: WorkerTotalsRow,
): WorkerTotalsSectionViewModel {
  // Usable totals: trusted + estimated fill for flagged (inaccurate) steps.
  // Rendered as a plain total — no visual guidance on the card for now.
  // `time_quality.*.wasted` is diagnostic-only and never added here.
  const quality = row.daily_stats.time_quality ?? null;
  const workingFill = fillToSeconds(quality?.working.estimated_fill ?? 0);
  const pausedFill = fillToSeconds(quality?.paused.estimated_fill ?? 0);

  return {
    workingTotal: resolveLiveTotal(
      row.daily_stats.total_working_seconds + workingFill,
      row.running.working_seconds,
      row.running.working_open_count,
      row.running.as_of,
    ),
    pausedTotal: resolveLiveTotal(
      row.daily_stats.total_pause_seconds + pausedFill,
      row.running.pause_seconds,
      row.running.pause_open_count,
      row.running.as_of,
    ),
    completedCount: row.daily_stats.total_completed_count,
  };
}

export function toWorkerInsightsSectionViewModel(
  row: WorkerInsightsRow,
): WorkerInsightsSectionViewModel {
  const insights = row.insights.filter(isKnownInsight);
  return {
    insights,
    topInsight: resolveInsightCopy(insights[0]),
  };
}

export function toWorkerIdentityViewModel(user: WorkerStatsUser): Pick<
  WorkerStatsCardViewModel,
  "userId" | "username" | "profilePicture"
> {
  return {
    userId: user.client_id,
    username: user.username,
    profilePicture: user.profile_picture,
  };
}

export function liveTotalToText(total: LiveTotal): string {
  return secondsToHM(
    total.kind === "static" ? total.seconds : total.offsetSeconds,
  );
}
