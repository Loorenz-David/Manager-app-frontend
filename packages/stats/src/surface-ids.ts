import type { CalendarQuickRangeOption, StatePillVariant } from "@beyo/ui";

import type { CalendarEventRecord } from "./lib/time-line-calendar/segment-adapter";
import type { TimelineViewMode } from "./lib/time-line-calendar/window";
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

export const WORKER_TIMELINE_SLIDE_SURFACE_ID = "worker-timeline-slide";

// Worker identity is passed from the tapped WorkerStatsCard so the header
// renders immediately; the drill-down response remains its source of truth.
// The parent dates are an INITIAL navigation anchor only — after mount the
// page owns its visible-date state.
export type WorkerTimelineSurfaceProps = {
  userId: string;
  username?: string;
  profilePicture?: string | null;
  initialDate?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
};

export function preloadWorkerTimelineSlideSurface(): Promise<unknown> {
  return import("./pages/WorkerTimelineSlidePage");
}

export const WORKER_TIMELINE_DATE_SHEET_SURFACE_ID =
  "worker-timeline-date-sheet";

// Package-owned date picker (DayCalendar primitive) with the 1-day/3-day
// view-mode toggle — the non-gesture fallback for pinch mode switching.
export type WorkerTimelineDateSheetProps = {
  selectedDate: string;
  mode: TimelineViewMode;
  maxDate: string;
  onSelect: (dateKey: string, mode: TimelineViewMode) => void;
};

export function preloadWorkerTimelineDateSheetSurface(): Promise<unknown> {
  return import("./pages/WorkerTimelineDateSheetPage");
}

export const WORKER_TIMELINE_EVENT_SHEET_SURFACE_ID =
  "worker-timeline-event-sheet";

// Record chooser for multi-record events: lists every contributing state
// record (true timestamps), visually grouped by task, and opens task detail.
export type WorkerTimelineEventSheetProps = {
  title: string;
  subtitle?: string | null;
  records: CalendarEventRecord[];
};

export function preloadWorkerTimelineEventSheetSurface(): Promise<unknown> {
  return import("./pages/WorkerTimelineEventSheetPage");
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
