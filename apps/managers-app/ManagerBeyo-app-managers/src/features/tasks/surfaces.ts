import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const TASK_DETAIL_SURFACE_ID = 'task-detail-slide';
export const TASK_ACTIONS_SHEET_SURFACE_ID = 'task-actions-sheet';
export const TASK_FILTER_SHEET_SURFACE_ID = 'task-filter-sheet';

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
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
      import('@/pages/tasks/TaskActionsSheetPage').then((module) => ({
        default: module.TaskActionsSheetPage,
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
};
