import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

import {
  WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID,
  WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID,
  WORKER_STATS_SLIDE_SURFACE_ID,
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

const workerStatsSlide = lazyWithPreload(loadWorkerStatsSlidePage);
const workerStatsInsightsSheet = lazyWithPreload(
  loadWorkerStatsInsightsSheetPage,
);
const workerStatsGranularitySlide = lazyWithPreload(
  loadWorkerStatsGranularitySlidePage,
);

export const preloadWorkerStatsSurface = workerStatsSlide.preload;
export const preloadWorkerStatsGranularitySurface =
  workerStatsGranularitySlide.preload;

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
};
