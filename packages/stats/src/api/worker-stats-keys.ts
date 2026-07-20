import type {
  ListWorkerInsightsParams,
  ListWorkerLastStepsParams,
  ListWorkerLinearTimelineParams,
  ListWorkerTotalsParams,
  TimeStrategy,
  WorkerGranularityIntention,
} from "../types";

export const workerStatsKeys = {
  all: ["worker-stats"] as const,
  lastInteractedLists: () =>
    [...workerStatsKeys.all, "last-interacted", "list"] as const,
  lastInteractedList: (params: ListWorkerLastStepsParams = {}) =>
    [...workerStatsKeys.lastInteractedLists(), params] as const,
  totalsLists: () => [...workerStatsKeys.all, "totals", "list"] as const,
  totalsList: (params: ListWorkerTotalsParams = {}) =>
    [...workerStatsKeys.totalsLists(), params] as const,
  linearTimelineLists: () =>
    [...workerStatsKeys.all, "linear-timeline", "list"] as const,
  linearTimelineList: (params: ListWorkerLinearTimelineParams = {}) =>
    [...workerStatsKeys.linearTimelineLists(), params] as const,
  linearTimelineBreakdowns: () =>
    [...workerStatsKeys.all, "linear-timeline", "breakdown"] as const,
  // One cache entry per exact request window — distinct windows never
  // overwrite each other (stale-response protection for free).
  linearTimelineBreakdown: (
    userId: string,
    params: { dateFrom: string; dateTo: string },
  ) => [...workerStatsKeys.linearTimelineBreakdowns(), userId, params] as const,
  insightsLists: () => [...workerStatsKeys.all, "insights", "list"] as const,
  insightsList: (params: ListWorkerInsightsParams = {}) =>
    [...workerStatsKeys.insightsLists(), params] as const,
  dailyStepsLists: () => [...workerStatsKeys.all, "daily-steps"] as const,
  // Stable across pages (offset is the pageParam, not part of the key).
  dailyStepsList: (
    userId: string,
    params: {
      intention: WorkerGranularityIntention;
      dateFrom: string;
      dateTo: string;
      timeStrategy?: TimeStrategy;
      onlyInaccurate?: boolean;
    },
  ) => [...workerStatsKeys.dailyStepsLists(), userId, params] as const,
};
