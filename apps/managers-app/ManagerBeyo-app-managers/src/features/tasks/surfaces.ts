import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';

export const TASK_DETAIL_SURFACE_ID = 'task-detail-slide';
export const TASK_ACTIONS_SHEET_SURFACE_ID = 'task-actions-sheet';
export const TASK_FILTER_SHEET_SURFACE_ID = 'task-filter-sheet';
export const TASK_SCHEDULED_DATE_SHEET_SURFACE_ID = 'task-scheduled-date-sheet';
export const ITEM_QUANTITY_SHEET_SURFACE_ID = 'item-quantity-sheet';
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID = 'item-upholstery-amount-sheet';
export const TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID = 'task-flow-record-detail-sheet';
export const TASK_EDIT_SLIDE_SURFACE_ID = 'task-edit-slide';
export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID = 'task-working-sections-slide';
export const TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID =
  'task-working-sections-discard-changes';

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDateSurfaceProps = {
  taskId: string;
  prefill?: {
    ready_by_at: string | null;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
  };
};

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: {
    quantity: number;
  };
};

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
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

export type RecoveredPendingAdd = {
  _pendingId: string;
  working_section_id: string;
  worker_id: string | null;
  working_section_name_snapshot: string | null;
  assigned_worker_display_name_snapshot: string | null;
};

export type RecoveredPendingReassignment = {
  step_id: string;
  worker_id: string;
  display_name: string | null;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
};

export type TaskWorkingSectionsDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};

function loadTaskDetailSlidePage() {
  return import('@/pages/tasks/TaskDetailSlidePage').then((module) => ({
    default: module.TaskDetailSlidePage,
  }));
}

function loadTaskDetailMenuSheetPage() {
  return import('@/pages/tasks/TaskDetailMenuSheetPage').then((module) => ({
    default: module.TaskDetailMenuSheetPage,
  }));
}

function loadTaskFilterSheetPage() {
  return import('@/pages/tasks/TaskFilterSheetPage').then((module) => ({
    default: module.TaskFilterSheetPage,
  }));
}

function loadTaskScheduledDateSheetPage() {
  return import('@/pages/tasks/TaskScheduledDateSheetPage').then((module) => ({
    default: module.TaskScheduledDateSheetPage,
  }));
}

function loadItemQuantitySheetPage() {
  return import('@/pages/tasks/ItemQuantitySheetPage').then((module) => ({
    default: module.ItemQuantitySheetPage,
  }));
}

function loadItemUpholsteryAmountSheetPage() {
  return import('@/pages/tasks/ItemUpholsteryAmountSheetPage').then((module) => ({
    default: module.ItemUpholsteryAmountSheetPage,
  }));
}

function loadTaskFlowRecordDetailSheetPage() {
  return import('@/pages/tasks/TaskFlowRecordDetailSheetPage').then((module) => ({
    default: module.TaskFlowRecordDetailSheetPage,
  }));
}

function loadTaskEditSlidePage() {
  return import('@/pages/tasks/TaskEditSlidePage').then((module) => ({
    default: module.TaskEditSlidePage,
  }));
}

function loadTaskWorkingSectionsSlidePage() {
  return import('@/pages/tasks/TaskWorkingSectionsSlidePage').then((module) => ({
    default: module.TaskWorkingSectionsSlidePage,
  }));
}

function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import('@/pages/tasks/TaskWorkingSectionsDiscardChangesSheetPage').then((module) => ({
    default: module.TaskWorkingSectionsDiscardChangesSheetPage,
  }));
}

const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const taskActionsSheet = lazyWithPreload(loadTaskDetailMenuSheetPage);
const taskFilterSheet = lazyWithPreload(loadTaskFilterSheetPage);
const taskScheduledDateSheet = lazyWithPreload(loadTaskScheduledDateSheetPage);
const itemQuantitySheet = lazyWithPreload(loadItemQuantitySheetPage);
const itemUpholsteryAmountSheet = lazyWithPreload(loadItemUpholsteryAmountSheetPage);
const taskFlowRecordDetailSheet = lazyWithPreload(loadTaskFlowRecordDetailSheetPage);
const taskEditSlide = lazyWithPreload(loadTaskEditSlidePage);
const taskWorkingSectionsSlide = lazyWithPreload(loadTaskWorkingSectionsSlidePage);
const taskWorkingSectionsDiscardChangesSheet = lazyWithPreload(
  loadTaskWorkingSectionsDiscardChangesSheetPage,
);

export const preloadTaskWorkingSectionsSurface = taskWorkingSectionsSlide.preload;

export const taskSurfaces: SurfaceRegistrations = {
  [TASK_DETAIL_SURFACE_ID]: {
    surface: 'slide',
    component: taskDetailSlide.Component,
  },
  [TASK_ACTIONS_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: taskActionsSheet.Component,
  },
  [TASK_FILTER_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: taskFilterSheet.Component,
  },
  [TASK_SCHEDULED_DATE_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: taskScheduledDateSheet.Component,
  },
  [ITEM_QUANTITY_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: itemQuantitySheet.Component,
  },
  [ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: itemUpholsteryAmountSheet.Component,
  },
  [TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: taskFlowRecordDetailSheet.Component,
  },
  [TASK_EDIT_SLIDE_SURFACE_ID]: {
    surface: 'slide',
    component: taskEditSlide.Component,
  },
  [TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID]: {
    surface: 'slide',
    component: taskWorkingSectionsSlide.Component,
  },
  [TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID]: {
    surface: 'sheet',
    component: taskWorkingSectionsDiscardChangesSheet.Component,
  },
};
