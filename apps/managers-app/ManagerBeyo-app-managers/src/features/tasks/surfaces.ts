import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  type ItemPositionSheetSurfaceProps,
} from "@beyo/items";
import {
  ITEM_IDENTITY_SHEET_SURFACE_ID,
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_TYPE_SHEET_SURFACE_ID,
  loadItemIdentitySheetPage,
  loadItemQuantitySheetPage,
  loadItemUpholsteryAmountSheetPage,
  loadPinNotificationsSlidePage,
  loadPinTaskStepStatesSheetPage,
  loadTaskDetailMenuSheetPage,
  loadTaskEditSlidePage,
  loadTaskTypeSheetPage,
  loadTaskFilterSheetPage,
  loadTaskFlowRecordDetailSheetPage,
  loadTaskDetailSlidePage,
  loadTaskAssortmentSheetPage,
  loadTaskPostHandlingFilterSheetPage,
  loadPostHandlingPendingWarningSheetPage,
  loadTaskFulfillmentMethodSheetPage,
  loadTaskPostHandlingSlidePage,
  loadTaskReadyByAtSheetPage,
  loadTaskScheduledDeliverySheetPage,
} from "@beyo/tasks";
import {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  loadTaskWorkingSectionsSlidePage,
  loadTaskWorkingSectionsDiscardChangesSheetPage,
  loadQuickTaskAssignSlidePage,
} from "@beyo/task-working-sections";
import {
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  loadTaskNotesSheetPage,
  loadTaskNoteUnreadViewerPage,
} from "@beyo/task-notes";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

export type ItemPositionSurfaceProps = ItemPositionSheetSurfaceProps;

const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const taskActionsSheet = lazyWithPreload(loadTaskDetailMenuSheetPage);
const taskFilterSheet = lazyWithPreload(loadTaskFilterSheetPage);
const taskReadyByAtSheet = lazyWithPreload(loadTaskReadyByAtSheetPage);
const taskAssortmentSheet = lazyWithPreload(loadTaskAssortmentSheetPage);
const taskFulfillmentMethodSheet = lazyWithPreload(
  loadTaskFulfillmentMethodSheetPage,
);
const taskScheduledDeliverySheet = lazyWithPreload(
  loadTaskScheduledDeliverySheetPage,
);
const taskPostHandlingSlide = lazyWithPreload(loadTaskPostHandlingSlidePage);
const taskPostHandlingFilterSheet = lazyWithPreload(
  loadTaskPostHandlingFilterSheetPage,
);
const taskPostHandlingPendingWarningSheet = lazyWithPreload(
  loadPostHandlingPendingWarningSheetPage,
);
const itemQuantitySheet = lazyWithPreload(loadItemQuantitySheetPage);
const itemIdentitySheet = lazyWithPreload(loadItemIdentitySheetPage);
const itemPositionSheet = lazyWithPreload(() =>
  import("@beyo/items").then((module) => ({
    default: module.ItemPositionSheetPage,
  })),
);
const itemUpholsteryAmountSheet = lazyWithPreload(
  loadItemUpholsteryAmountSheetPage,
);
const taskFlowRecordDetailSheet = lazyWithPreload(
  loadTaskFlowRecordDetailSheetPage,
);
const taskEditSlide = lazyWithPreload(loadTaskEditSlidePage);
const taskTypeSheet = lazyWithPreload(loadTaskTypeSheetPage);
const taskWorkingSectionsSlide = lazyWithPreload(
  loadTaskWorkingSectionsSlidePage,
);
const taskWorkingSectionsDiscardChangesSheet = lazyWithPreload(
  loadTaskWorkingSectionsDiscardChangesSheetPage,
);
const quickTaskAssignSlide = lazyWithPreload(loadQuickTaskAssignSlidePage);

const pinNotificationsSlide = lazyWithPreload(loadPinNotificationsSlidePage);
const pinTaskStepStatesSheet = lazyWithPreload(
  loadPinTaskStepStatesSheetPage,
);
const taskNotesSheet = lazyWithPreload(loadTaskNotesSheetPage);
const taskNoteUnreadViewer = lazyWithPreload(loadTaskNoteUnreadViewerPage);

export const preloadPinNotificationsSlideSurface =
  pinNotificationsSlide.preload;
export const preloadPinTaskStepStatesSheetSurface =
  pinTaskStepStatesSheet.preload;
export const preloadTaskNotesSheetSurface = taskNotesSheet.preload;
export const preloadTaskNoteUnreadViewerSurface =
  taskNoteUnreadViewer.preload;
export const preloadTaskPostHandlingPendingWarningSheetSurface =
  taskPostHandlingPendingWarningSheet.preload;

export {
  ITEM_IDENTITY_SHEET_SURFACE_ID,
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_TYPE_SHEET_SURFACE_ID,
} from "@beyo/tasks";
export {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "@beyo/task-working-sections";
export type {
  ItemIdentitySurfaceProps,
  ItemQuantitySurfaceProps,
  ItemUpholsteryAmountSurfaceProps,
  PinNotificationsSlideSurfaceProps,
  PinTaskStepStatesSheetSurfaceProps,
  TaskActionsSurfaceProps,
  TaskAssortmentSheetSurfaceProps,
  TaskDetailSurfaceProps,
  TaskEditSurfaceProps,
  TaskFlowRecordDetailSurfaceProps,
  TaskPostHandlingFilterSheetSurfaceProps,
  TaskFulfillmentMethodSheetSurfaceProps,
  TaskPostHandlingPendingWarningSheetSurfaceProps,
  TaskPostHandlingSlideSurfaceProps,
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceProps,
  TaskTypeSheetSurfaceProps,
} from "@beyo/tasks";
export type {
  QuickTaskAssignSurfaceProps,
  TaskWorkingSectionsSurfaceProps,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
} from "@beyo/task-working-sections";
export type { TaskNotesSheetSurfaceProps } from "@beyo/task-notes";
export type { TaskNoteUnreadViewerSurfaceProps } from "@beyo/task-notes";

export const taskSurfaces: SurfaceRegistrations = {
  [TASK_DETAIL_SURFACE_ID]: {
    surface: "slide",
    component: taskDetailSlide.Component,
  },
  [TASK_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskActionsSheet.Component,
  },
  [TASK_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskFilterSheet.Component,
  },
  [TASK_READY_BY_AT_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskReadyByAtSheet.Component,
  },
  [TASK_ASSORTMENT_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskAssortmentSheet.Component,
  },
  [TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskFulfillmentMethodSheet.Component,
  },
  [TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskScheduledDeliverySheet.Component,
  },
  [TASK_POST_HANDLING_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskPostHandlingSlide.Component,
  },
  [TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskPostHandlingFilterSheet.Component,
  },
  [TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskPostHandlingPendingWarningSheet.Component,
  },
  [ITEM_QUANTITY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemQuantitySheet.Component,
  },
  [ITEM_IDENTITY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemIdentitySheet.Component,
  },
  [ITEM_POSITION_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemPositionSheet.Component,
  },
  [ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemUpholsteryAmountSheet.Component,
  },
  [TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskFlowRecordDetailSheet.Component,
  },
  [TASK_EDIT_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskEditSlide.Component,
  },
  [TASK_TYPE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskTypeSheet.Component,
  },
  [TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskWorkingSectionsSlide.Component,
  },
  [TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID]: {
    surface: "sheet",
    component: taskWorkingSectionsDiscardChangesSheet.Component,
  },
  [QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: quickTaskAssignSlide.Component,
  },
  [PIN_NOTIFICATIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: pinNotificationsSlide.Component,
  },
  [PIN_TASK_STEP_STATES_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: pinTaskStepStatesSheet.Component,
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
