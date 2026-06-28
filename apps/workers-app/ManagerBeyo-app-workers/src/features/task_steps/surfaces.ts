import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID } from "@beyo/item-issues";
import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
  loadTaskWorkingSectionsDiscardChangesSheetPage,
  loadTaskWorkingSectionsReassignSlidePage,
} from "@beyo/task-working-sections";
import {
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  loadTaskNotesSheetPage,
  loadTaskNoteUnreadViewerPage,
} from "@beyo/task-notes";
import {
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  loadTaskScheduledDeliverySheetPage,
} from "@beyo/tasks";
import {
  BATCH_DETAIL_SLIDE_SURFACE_ID,
  COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID,
  COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID,
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

function loadCompleteTaskStepConfirmationSlidePage() {
  return import(
    "@/pages/task_steps/CompleteTaskStepConfirmationSlidePage"
  ).then((module) => ({
    default: module.CompleteTaskStepConfirmationSlidePage,
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

function loadBatchDetailSlidePage() {
  return import("@/pages/task_steps/BatchDetailSlidePage").then((module) => ({
    default: module.BatchDetailSlidePage,
  }));
}

function loadCompleteBatchTaskStepsConfirmationSlidePage() {
  return import(
    "@/pages/task_steps/CompleteBatchTaskStepsConfirmationSlidePage"
  ).then((module) => ({
    default: module.CompleteBatchTaskStepsConfirmationSlidePage,
  }));
}

function loadItemIssueSelectionSheetPage() {
  return import("@beyo/item-issues").then((module) => ({
    default: module.ItemIssueSelectionSheet,
  }));
}

const itemPositionSheet = lazyWithPreload(() =>
  import("@beyo/items").then((module) => ({
    default: module.ItemPositionSheetPage,
  })),
);
const taskScheduledDeliverySheet = lazyWithPreload(
  loadTaskScheduledDeliverySheetPage,
);
const taskStepActionsSheet = lazyWithPreload(loadTaskStepActionsSheetPage);
const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const completeTaskStepConfirmationSlide = lazyWithPreload(
  loadCompleteTaskStepConfirmationSlidePage,
);
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
const batchDetailSlide = lazyWithPreload(loadBatchDetailSlidePage);
const completeBatchTaskStepsConfirmationSlide = lazyWithPreload(
  loadCompleteBatchTaskStepsConfirmationSlidePage,
);
const itemIssueSelectionSheet = lazyWithPreload(
  loadItemIssueSelectionSheetPage,
);
const taskWorkingSectionsReassignSlide = lazyWithPreload(
  loadTaskWorkingSectionsReassignSlidePage,
);
const taskWorkingSectionsDiscardChangesSheet = lazyWithPreload(
  loadTaskWorkingSectionsDiscardChangesSheetPage,
);
const taskNotesSheet = lazyWithPreload(loadTaskNotesSheetPage);
const taskNoteUnreadViewer = lazyWithPreload(loadTaskNoteUnreadViewerPage);

export const preloadTaskStepActionsSheetSurface = taskStepActionsSheet.preload;
export const preloadTaskDetailSlideSurface = taskDetailSlide.preload;
export const preloadTaskScheduledDeliverySheetSurface =
  taskScheduledDeliverySheet.preload;
export const preloadCompleteTaskStepConfirmationSlideSurface =
  completeTaskStepConfirmationSlide.preload;
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
export const preloadBatchDetailSlideSurface = batchDetailSlide.preload;
export const preloadCompleteBatchTaskStepsConfirmationSlideSurface =
  completeBatchTaskStepsConfirmationSlide.preload;
export const preloadItemIssueSelectionSheetSurface =
  itemIssueSelectionSheet.preload;
export const preloadTaskNotesSheetSurface = taskNotesSheet.preload;
export const preloadTaskNoteUnreadViewerSurface =
  taskNoteUnreadViewer.preload;
export const preloadTaskWorkingSectionsReassignSlideSurface =
  taskWorkingSectionsReassignSlide.preload;
export const preloadTaskWorkingSectionsDiscardChangesSheetSurface =
  taskWorkingSectionsDiscardChangesSheet.preload;

export const taskStepSurfaces: SurfaceRegistrations = {
  [ITEM_POSITION_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemPositionSheet.Component,
  },
  [TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskScheduledDeliverySheet.Component,
  },
  [TASK_STEP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskStepActionsSheet.Component,
  },
  [COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: completeTaskStepConfirmationSlide.Component,
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
  [TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskWorkingSectionsReassignSlide.Component,
  },
  [TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID]: {
    surface: "sheet",
    component: taskWorkingSectionsDiscardChangesSheet.Component,
  },
  [BATCH_DETAIL_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: batchDetailSlide.Component,
  },
  [COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: completeBatchTaskStepsConfirmationSlide.Component,
  },
  [TASK_NOTES_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskNotesSheet.Component,
  },
  [TASK_NOTE_UNREAD_VIEWER_SURFACE_ID]: {
    surface: "sheet",
    component: taskNoteUnreadViewer.Component,
  },
};
