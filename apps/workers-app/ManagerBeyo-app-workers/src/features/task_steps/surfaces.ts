import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from "@beyo/tasks";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
} from "./surface-ids";

function loadTaskStepActionsSheetPage() {
  return import("@/pages/task_steps/TaskStepActionsSheetPage").then(
    (module) => ({
      default: module.TaskStepActionsSheetPage,
    }),
  );
}

function loadTaskDetailSlidePage() {
  return import("@/pages/task_steps/TaskDetailSlidePage").then((module) => ({
    default: module.TaskDetailSlidePage,
  }));
}

function loadPauseReasonSheetPage() {
  return import("@/pages/task_steps/PauseReasonSheetPage").then((module) => ({
    default: module.PauseReasonSheetPage,
  }));
}

function loadStepStateFilterSheetPage() {
  return import("@/pages/task_steps/StepStateFilterSheetPage").then(
    (module) => ({
      default: module.StepStateFilterSheetPage,
    }),
  );
}

function loadItemFastIssueSheetPage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.ItemFastIssueSheetPage,
  }));
}

const taskStepActionsSheet = lazyWithPreload(loadTaskStepActionsSheetPage);
const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const pauseReasonSheet = lazyWithPreload(loadPauseReasonSheetPage);
const stepStateFilterSheet = lazyWithPreload(loadStepStateFilterSheetPage);
const itemFastIssueSheet = lazyWithPreload(loadItemFastIssueSheetPage);

export const preloadTaskStepActionsSheetSurface = taskStepActionsSheet.preload;
export const preloadTaskDetailSlideSurface = taskDetailSlide.preload;
export const preloadPauseReasonSheetSurface = pauseReasonSheet.preload;
export const preloadStepStateFilterSheetSurface =
  stepStateFilterSheet.preload;
export const preloadItemFastIssueSheetSurface = itemFastIssueSheet.preload;

export const taskStepSurfaces: SurfaceRegistrations = {
  [TASK_STEP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskStepActionsSheet.Component,
  },
  [PAUSE_REASON_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: pauseReasonSheet.Component,
  },
  [STEP_STATE_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: stepStateFilterSheet.Component,
  },
  [TASK_STEP_DETAIL_SURFACE_ID]: {
    surface: "slide",
    component: taskDetailSlide.Component,
  },
  [ITEM_FAST_ISSUE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemFastIssueSheet.Component,
  },
};
