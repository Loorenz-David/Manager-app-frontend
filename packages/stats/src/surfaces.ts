import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

import {
  WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID,
  WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID,
  WORKER_STATS_SLIDE_SURFACE_ID,
  WORKER_TIMELINE_DATE_SHEET_SURFACE_ID,
  WORKER_TIMELINE_EVENT_SHEET_SURFACE_ID,
  WORKER_TIMELINE_SLIDE_SURFACE_ID,
} from "./surface-ids";

export function loadWorkerStatsSlidePage() {
  return import("./pages/WorkerStatsSlidePage").then((module) => ({
    default: module.WorkerStatsSlidePage,
  }));
}

export function loadWorkerStatsInsightsSheetPage() {
  return import("./pages/WorkerStatsInsightsSheetPage").then((module) => ({
    default: module.WorkerStatsInsightsSheetPage,
  }));
}

export function loadWorkerStatsGranularitySlidePage() {
  return import("./pages/WorkerStatsGranularitySlidePage").then((module) => ({
    default: module.WorkerStatsGranularitySlidePage,
  }));
}

export function loadWorkerTimelineSlidePage() {
  return import("./pages/WorkerTimelineSlidePage").then((module) => ({
    default: module.WorkerTimelineSlidePage,
  }));
}

export function loadWorkerTimelineDateSheetPage() {
  return import("./pages/WorkerTimelineDateSheetPage").then((module) => ({
    default: module.WorkerTimelineDateSheetPage,
  }));
}

export function loadWorkerTimelineEventSheetPage() {
  return import("./pages/WorkerTimelineEventSheetPage").then((module) => ({
    default: module.WorkerTimelineEventSheetPage,
  }));
}

const workerStatsSlide = lazyWithPreload(loadWorkerStatsSlidePage);
const workerStatsInsightsSheet = lazyWithPreload(
  loadWorkerStatsInsightsSheetPage,
);
const workerStatsGranularitySlide = lazyWithPreload(
  loadWorkerStatsGranularitySlidePage,
);
const workerTimelineSlide = lazyWithPreload(loadWorkerTimelineSlidePage);
const workerTimelineDateSheet = lazyWithPreload(loadWorkerTimelineDateSheetPage);
const workerTimelineEventSheet = lazyWithPreload(
  loadWorkerTimelineEventSheetPage,
);

export const preloadWorkerStatsSurface = workerStatsSlide.preload;
export const preloadWorkerStatsGranularitySurface =
  workerStatsGranularitySlide.preload;
export const preloadWorkerTimelineSurface = workerTimelineSlide.preload;

export const workerStatsSurfaces: SurfaceRegistrations = {
  [WORKER_STATS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: workerStatsSlide.Component,
  },
  [WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: workerStatsInsightsSheet.Component,
  },
  [WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: workerStatsGranularitySlide.Component,
  },
  [WORKER_TIMELINE_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: workerTimelineSlide.Component,
  },
  [WORKER_TIMELINE_DATE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: workerTimelineDateSheet.Component,
  },
  [WORKER_TIMELINE_EVENT_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: workerTimelineEventSheet.Component,
  },
};
