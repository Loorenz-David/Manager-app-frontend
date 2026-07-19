import type { CalendarQuickRangeOption, StatePillVariant } from "@beyo/ui";

import type { TickerModel } from "./lib/worker-stats-dto";
import type { WorkerGranularityIntention, WorkerInsight } from "./types";

export const WORKER_STATS_SLIDE_SURFACE_ID = "worker-stats-slide";

type CalendarRangeOpenerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
  quickRangeOptions?: CalendarQuickRangeOption[];
};

export type WorkerStatsSurfaceOpeners = {
  openCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void;
};

export type WorkerStatsSlideSurfaceProps = {
  surfaceOpeners?: WorkerStatsSurfaceOpeners;
};

export function preloadWorkerStatsSlideSurface(): Promise<unknown> {
  return import("./pages/WorkerStatsSlidePage");
}

export const WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID =
  "worker-stats-granularity-slide";

// Worker header values are passed straight from the tapped WorkerStatsCard
// view model so the header renders immediately. Totals are NOT passed — the
// daily-steps response is their source of truth (the page derives the usable
// totals per selected time strategy from it).
export type WorkerStatsGranularitySurfaceProps = {
  userId: string;
  username: string;
  profilePicture: string | null;
  stepStateLabel: string | null;
  stepStateVariant: StatePillVariant | null;
  ticker: TickerModel | null;
  initialIntention: WorkerGranularityIntention;
  dateFrom: string;
  dateTo: string;
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
