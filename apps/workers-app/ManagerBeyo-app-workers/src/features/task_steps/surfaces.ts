import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID } from "@beyo/item-issues";
import {
  PAUSE_REASON_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
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

function loadStepDependencyWarningSheetPage() {
  return import("@/pages/task_steps/StepDependencyWarningSheetPage").then(
    (module) => ({
      default: module.StepDependencyWarningSheetPage,
    }),
  );
}

function loadUpholsteryWarningSheetPage() {
  return import("@/pages/task_steps/UpholsteryWarningSheetPage").then(
    (module) => ({
      default: module.UpholsteryWarningSheetPage,
    }),
  );
}

function loadUpholsterySelectionMissingSheetPage() {
  return import(
    "@/pages/task_steps/UpholsterySelectionMissingSheetPage"
  ).then((module) => ({
    default: module.UpholsterySelectionMissingSheetPage,
  }));
}

function loadStepStateFilterSheetPage() {
  return import("@/pages/task_steps/StepStateFilterSheetPage").then(
    (module) => ({
      default: module.StepStateFilterSheetPage,
    }),
  );
}

function loadPinNotificationsSlidePage() {
  return import("@/pages/task_steps/PinNotificationsSlidePage").then(
    (module) => ({
      default: module.PinNotificationsSlidePage,
    }),
  );
}

function loadPinTaskStepStatesSheetPage() {
  return import("@/pages/task_steps/PinTaskStepStatesSheetPage").then(
    (module) => ({
      default: module.PinTaskStepStatesSheetPage,
    }),
  );
}

function loadItemIssueSelectionSheetPage() {
  return import("@beyo/item-issues").then((module) => ({
    default: module.ItemIssueSelectionSheet,
  }));
}

const taskStepActionsSheet = lazyWithPreload(loadTaskStepActionsSheetPage);
const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const pauseReasonSheet = lazyWithPreload(loadPauseReasonSheetPage);
const stepDependencyWarningSheet = lazyWithPreload(
  loadStepDependencyWarningSheetPage,
);
const upholsteryWarningSheet = lazyWithPreload(
  loadUpholsteryWarningSheetPage,
);
const upholsterySelectionMissingSheet = lazyWithPreload(
  loadUpholsterySelectionMissingSheetPage,
);
const stepStateFilterSheet = lazyWithPreload(loadStepStateFilterSheetPage);
const pinNotificationsSlide = lazyWithPreload(loadPinNotificationsSlidePage);
const pinTaskStepStatesSheet = lazyWithPreload(
  loadPinTaskStepStatesSheetPage,
);
const itemIssueSelectionSheet = lazyWithPreload(
  loadItemIssueSelectionSheetPage,
);

export const preloadTaskStepActionsSheetSurface = taskStepActionsSheet.preload;
export const preloadTaskDetailSlideSurface = taskDetailSlide.preload;
export const preloadPauseReasonSheetSurface = pauseReasonSheet.preload;
export const preloadStepDependencyWarningSheetSurface =
  stepDependencyWarningSheet.preload;
export const preloadUpholsteryWarningSheetSurface =
  upholsteryWarningSheet.preload;
export const preloadUpholsterySelectionMissingSheetSurface =
  upholsterySelectionMissingSheet.preload;
export const preloadStepStateFilterSheetSurface =
  stepStateFilterSheet.preload;
export const preloadPinNotificationsSlideSurface =
  pinNotificationsSlide.preload;
export const preloadPinTaskStepStatesSheetSurface =
  pinTaskStepStatesSheet.preload;
export const preloadItemIssueSelectionSheetSurface =
  itemIssueSelectionSheet.preload;

export const taskStepSurfaces: SurfaceRegistrations = {
  [TASK_STEP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskStepActionsSheet.Component,
  },
  [PAUSE_REASON_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: pauseReasonSheet.Component,
  },
  [STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: stepDependencyWarningSheet.Component,
  },
  [UPHOLSTERY_WARNING_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: upholsteryWarningSheet.Component,
  },
  [UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: upholsterySelectionMissingSheet.Component,
  },
  [STEP_STATE_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: stepStateFilterSheet.Component,
  },
  [PIN_NOTIFICATIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: pinNotificationsSlide.Component,
  },
  [PIN_TASK_STEP_STATES_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: pinTaskStepStatesSheet.Component,
  },
  [TASK_STEP_DETAIL_SURFACE_ID]: {
    surface: "slide",
    component: taskDetailSlide.Component,
  },
  [ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemIssueSelectionSheet.Component,
  },
};
