import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const TASK_CREATION_RETURN_SURFACE_ID = 'task-creation-return-slide';
export const TASK_CREATION_PRE_ORDER_SURFACE_ID = 'task-creation-pre-order-slide';
export const TASK_CREATION_INTERNAL_SURFACE_ID = 'task-creation-internal-slide';

export const taskCreationSurfaces: SurfaceRegistrations = {
  [TASK_CREATION_RETURN_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/ReturnTaskSlidePage').then((module) => ({
        default: module.ReturnTaskSlidePage,
      })),
    ),
  },
  [TASK_CREATION_PRE_ORDER_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/PreOrderTaskSlidePage').then((module) => ({
        default: module.PreOrderTaskSlidePage,
      })),
    ),
  },
  [TASK_CREATION_INTERNAL_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/InternalTaskSlidePage').then((module) => ({
        default: module.InternalTaskSlidePage,
      })),
    ),
  },
};
