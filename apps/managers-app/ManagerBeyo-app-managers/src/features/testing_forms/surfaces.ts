import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const testingFormsSurfaces: SurfaceRegistrations = {
  'testing-forms-slide': {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/testing_forms/TestingFormsSlidePage').then((module) => ({
        default: module.TestingFormsSlidePage,
      })),
    ),
  },
};
