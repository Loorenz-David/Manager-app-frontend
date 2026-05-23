import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const TASK_DETAIL_SURFACE_ID = 'task-detail-slide';
export const TASK_ACTIONS_SHEET_SURFACE_ID = 'task-actions-sheet';
export const TASK_FILTER_SHEET_SURFACE_ID = 'task-filter-sheet';
export const TASK_SCHEDULED_DATE_SHEET_SURFACE_ID = 'task-scheduled-date-sheet';
export const ITEM_QUANTITY_SHEET_SURFACE_ID = 'item-quantity-sheet';
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID = 'item-upholstery-amount-sheet';
export const TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID = 'task-flow-record-detail-sheet';
export const TASK_EDIT_SLIDE_SURFACE_ID = 'task-edit-slide';

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDateSurfaceProps = {
  taskId: string;
};

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
};

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
};

export type TaskFlowRecordDetailSurfaceProps = {
  taskId: string;
  flowRecordId: string;
};

export type TaskEditSurfaceProps = {
  taskId: string;
};

export const taskSurfaces: SurfaceRegistrations = {
  [TASK_DETAIL_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/tasks/TaskDetailSlidePage').then((module) => ({
        default: module.TaskDetailSlidePage,
      })),
    ),
  },
  [TASK_ACTIONS_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskDetailMenuSheetPage').then((module) => ({
        default: module.TaskDetailMenuSheetPage,
      })),
    ),
  },
  [TASK_FILTER_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskFilterSheetPage').then((module) => ({
        default: module.TaskFilterSheetPage,
      })),
    ),
  },
  [TASK_SCHEDULED_DATE_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskScheduledDateSheetPage').then((module) => ({
        default: module.TaskScheduledDateSheetPage,
      })),
    ),
  },
  [ITEM_QUANTITY_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/ItemQuantitySheetPage').then((module) => ({
        default: module.ItemQuantitySheetPage,
      })),
    ),
  },
  [ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/ItemUpholsteryAmountSheetPage').then((module) => ({
        default: module.ItemUpholsteryAmountSheetPage,
      })),
    ),
  },
  [TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskFlowRecordDetailSheetPage').then((module) => ({
        default: module.TaskFlowRecordDetailSheetPage,
      })),
    ),
  },
  [TASK_EDIT_SLIDE_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/tasks/TaskEditSlidePage').then((module) => ({
        default: module.TaskEditSlidePage,
      })),
    ),
  },
};
