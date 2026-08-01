import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  REASSIGNED_STEPS_SLIDE_SURFACE_ID,
  loadReassignedStepsSlidePage,
} from "@beyo/task-working-sections";
import { WORKER_STATE_SHEET_SURFACE_ID } from "./surface-ids";

function loadWorkerStateSheetPage() {
  return import("@/pages/home/WorkerStateSheetPage").then((module) => ({
    default: module.WorkerStateSheetPage,
  }));
}

const workerStateSheet = lazyWithPreload(loadWorkerStateSheetPage);
// Delegates to the package's own loader so the page is genuinely code-split
// (35_shared_packages.md §14).
const reassignedStepsSlide = lazyWithPreload(loadReassignedStepsSlidePage);

export const preloadWorkerStateSheetSurface = workerStateSheet.preload;
export const preloadReassignedStepsSlideSurface = reassignedStepsSlide.preload;

export const homeSurfaces: SurfaceRegistrations = {
  [WORKER_STATE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: workerStateSheet.Component,
  },
  [REASSIGNED_STEPS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: reassignedStepsSlide.Component,
  },
};
