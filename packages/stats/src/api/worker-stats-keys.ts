import type {
  ListWorkerStatsParams,
  WorkerGranularityIntention,
} from "../types";

export const workerStatsKeys = {
  all: ["worker-stats"] as const,
  lastInteractedLists: () =>
    [...workerStatsKeys.all, "last-interacted", "list"] as const,
  lastInteractedList: (params: ListWorkerStatsParams = {}) =>
    [...workerStatsKeys.lastInteractedLists(), params] as const,
  dailyStepsLists: () => [...workerStatsKeys.all, "daily-steps"] as const,
  // Stable across pages (offset is the pageParam, not part of the key).
  dailyStepsList: (
    userId: string,
    params: { intention: WorkerGranularityIntention; workDate?: string },
  ) => [...workerStatsKeys.dailyStepsLists(), userId, params] as const,
};
