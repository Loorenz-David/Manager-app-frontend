import type { StatePillVariant } from "@beyo/ui";

import type { TickerModel } from "./lib/worker-stats-dto";
import type { WorkerGranularityIntention, WorkerInsight } from "./types";

export const WORKER_STATS_SLIDE_SURFACE_ID = "worker-stats-slide";

export function preloadWorkerStatsSlideSurface(): Promise<unknown> {
  return import("./pages/WorkerStatsSlidePage");
}

export const WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID =
  "worker-stats-granularity-slide";

// Worker header/totals values are passed straight from the tapped
// WorkerStatsCard view model so the header renders immediately, independent of
// the granular daily-steps query.
export type WorkerStatsGranularitySurfaceProps = {
  userId: string;
  username: string;
  profilePicture: string | null;
  stepStateLabel: string | null;
  stepStateVariant: StatePillVariant | null;
  ticker: TickerModel | null;
  workingDisplay: string;
  pausedDisplay: string;
  completedCount: number;
  initialIntention: WorkerGranularityIntention;
};

export function preloadWorkerStatsGranularitySlideSurface(): Promise<unknown> {
  return import("./pages/WorkerStatsGranularitySlidePage");
}

export const WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID =
  "worker-stats-insights-sheet";

export type WorkerStatsInsightsSheetProps = {
  insights: WorkerInsight[];
  workerName?: string;
  profilePicture?: string | null;
};

export function preloadWorkerStatsInsightsSheetSurface(): Promise<unknown> {
  return import("./pages/WorkerStatsInsightsSheetPage");
}
