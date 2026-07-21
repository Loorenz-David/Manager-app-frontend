import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  type StepState,
} from "@beyo/tasks";
import type { StatePillVariant } from "@beyo/ui";

import {
  isKnownInsight,
  resolveInsightCopy,
  type ResolvedInsight,
} from "./insight-copy";
import type {
  WorkerInsightsRow,
  WorkerLastStep,
  WorkerLastStepRow,
  WorkerLinearTimelineRow,
  WorkerStatsUser,
} from "../types";

export type TickerModel = {
  offsetSeconds: number;
  startedAtIso: string;
};

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

// Wall-clock partition of the shift from /linear-timeline. Settled values —
// no live ticking (that endpoint carries no `running` add-on).
export type WorkerTimelineSectionViewModel = {
  workingSeconds: number;
  pausedSeconds: number;
  idleSeconds: number;
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
  timeline: SectionState<WorkerTimelineSectionViewModel>;
  insights: SectionState<WorkerInsightsSectionViewModel>;
};

// Live ticker for the pill. The settled `total_*_seconds` EXCLUDE the currently
// open interval (see RunningTotals contract in types.ts), so the timer must
// anchor to when the step entered its current state — `last_state_record
// .entered_at` — NOT to fetch time. Anchoring to fetch time would drop the open
// interval's elapsed and re-tick from the settled total on every reload/render.
// Displayed = total settled + (now − entered_at) = the true live total.
export function resolveTicker(step: WorkerLastStep | null): TickerModel | null {
  if (!step?.last_state_record) {
    return null;
  }

  if (step.state === "working") {
    return {
      offsetSeconds: step.total_working_seconds,
      startedAtIso: step.last_state_record.entered_at,
    };
  }

  if (step.state === "paused") {
    return {
      offsetSeconds: step.total_pause_seconds,
      startedAtIso: step.last_state_record.entered_at,
    };
  }

  return null;
}

export function toWorkerStepSectionViewModel(
  row: WorkerLastStepRow,
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
    ticker: resolveTicker(step),
  };
}

export function toWorkerTimelineSectionViewModel(
  row: WorkerLinearTimelineRow,
): WorkerTimelineSectionViewModel {
  return {
    workingSeconds: row.timeline.working_seconds,
    pausedSeconds: row.timeline.pause_seconds,
    idleSeconds: row.timeline.idle_seconds,
    completedCount: row.timeline.completed_count,
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
