import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  type ItemPositionSheetSurfaceProps,
} from "@beyo/items";
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
} from "@beyo/tasks";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

export const TASK_DETAIL_SURFACE_ID = "task-detail-slide";
export const TASK_ACTIONS_SHEET_SURFACE_ID = "task-actions-sheet";
export const TASK_FILTER_SHEET_SURFACE_ID = "task-filter-sheet";
export const ITEM_QUANTITY_SHEET_SURFACE_ID = "item-quantity-sheet";
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID =
  "item-upholstery-amount-sheet";
export const TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID =
  "task-flow-record-detail-sheet";
export const TASK_EDIT_SLIDE_SURFACE_ID = "task-edit-slide";
export const PIN_NOTIFICATIONS_SLIDE_SURFACE_ID =
  "task-pin-notifications-slide";
export const PIN_TASK_STEP_STATES_SHEET_SURFACE_ID =
  "task-pin-step-states-sheet";

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: {
    quantity: number;
  };
};

export type ItemPositionSurfaceProps = ItemPositionSheetSurfaceProps;

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
  showQuantityChangedWarning?: boolean;
  prefill?: {
    amountMeters: number | null;
  };
};

export type TaskFlowRecordDetailSurfaceProps = {
  taskId: string;
  flowRecordId: string;
};

export type TaskEditSurfaceProps = {
  taskId: string;
};

export type PinNotificationsSlideSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};

export type PinTaskStepStatesSheetSurfaceProps = {
  stepId: string;
  label: string;
  imageUrl?: string | null;
  currentState: string;
  selectedStates: string[];
  onApply: (states: string[]) => void;
};

function loadTaskDetailSlidePage() {
  return import("@/pages/tasks/TaskDetailSlidePage").then((module) => ({
    default: module.TaskDetailSlidePage,
  }));
}

function loadTaskDetailMenuSheetPage() {
  return import("@/pages/tasks/TaskDetailMenuSheetPage").then((module) => ({
    default: module.TaskDetailMenuSheetPage,
  }));
}

function loadTaskFilterSheetPage() {
  return import("@/pages/tasks/TaskFilterSheetPage").then((module) => ({
    default: module.TaskFilterSheetPage,
  }));
}

function loadItemQuantitySheetPage() {
  return import("@/pages/tasks/ItemQuantitySheetPage").then((module) => ({
    default: module.ItemQuantitySheetPage,
  }));
}

function loadItemUpholsteryAmountSheetPage() {
  return import("@/pages/tasks/ItemUpholsteryAmountSheetPage").then(
    (module) => ({
      default: module.ItemUpholsteryAmountSheetPage,
    }),
  );
}

function loadTaskFlowRecordDetailSheetPage() {
  return import("@/pages/tasks/TaskFlowRecordDetailSheetPage").then(
    (module) => ({
      default: module.TaskFlowRecordDetailSheetPage,
    }),
  );
}

function loadTaskEditSlidePage() {
  return import("@/pages/tasks/TaskEditSlidePage").then((module) => ({
    default: module.TaskEditSlidePage,
  }));
}

function loadTaskWorkingSectionsSlidePage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskWorkingSectionsSlidePage,
  }));
}

function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskWorkingSectionsDiscardChangesSheetPage,
  }));
}

function loadPinNotificationsSlidePage() {
  return import("@/pages/tasks/PinNotificationsSlidePage").then((module) => ({
    default: module.PinNotificationsSlidePage,
  }));
}

function loadPinTaskStepStatesSheetPage() {
  return import("@/pages/tasks/PinTaskStepStatesSheetPage").then((module) => ({
    default: module.PinTaskStepStatesSheetPage,
  }));
}

const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const taskActionsSheet = lazyWithPreload(loadTaskDetailMenuSheetPage);
const taskFilterSheet = lazyWithPreload(loadTaskFilterSheetPage);
const taskReadyByAtSheet = lazyWithPreload(() =>
  import("@beyo/tasks").then((module) => ({
    default: module.TaskReadyByAtSheetPage,
  })),
);
const taskScheduledDeliverySheet = lazyWithPreload(() =>
  import("@beyo/tasks").then((module) => ({
    default: module.TaskScheduledDeliverySheetPage,
  })),
);
const itemQuantitySheet = lazyWithPreload(loadItemQuantitySheetPage);
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
const taskWorkingSectionsSlide = lazyWithPreload(
  loadTaskWorkingSectionsSlidePage,
);
const taskWorkingSectionsDiscardChangesSheet = lazyWithPreload(
  loadTaskWorkingSectionsDiscardChangesSheetPage,
);
const pinNotificationsSlide = lazyWithPreload(loadPinNotificationsSlidePage);
const pinTaskStepStatesSheet = lazyWithPreload(
  loadPinTaskStepStatesSheetPage,
);

export const preloadPinNotificationsSlideSurface =
  pinNotificationsSlide.preload;
export const preloadPinTaskStepStatesSheetSurface =
  pinTaskStepStatesSheet.preload;

export {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "@beyo/tasks";
export type {
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceProps,
  TaskWorkingSectionsSurfaceProps,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
} from "@beyo/tasks";

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
  [TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskScheduledDeliverySheet.Component,
  },
  [ITEM_QUANTITY_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemQuantitySheet.Component,
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
  [TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskWorkingSectionsSlide.Component,
  },
  [TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID]: {
    surface: "sheet",
    component: taskWorkingSectionsDiscardChangesSheet.Component,
  },
  [PIN_NOTIFICATIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: pinNotificationsSlide.Component,
  },
  [PIN_TASK_STEP_STATES_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: pinTaskStepStatesSheet.Component,
  },
};
