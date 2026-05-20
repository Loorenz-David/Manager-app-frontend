import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const testSurfaces: SurfaceRegistrations = {
  'test-sheet': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/test_feature/TestSheetPage').then((module) => ({
        default: module.TestSheetPage,
      })),
    ),
  },
  'test-slide': {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/test_feature/TestSlidePage').then((module) => ({
        default: module.TestSlidePage,
      })),
    ),
  },
  'test-sheet-nested': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/test_feature/TestNestedSheetPage').then((module) => ({
        default: module.TestNestedSheetPage,
      })),
    ),
  },
  'test-slide-nested': {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/test_feature/TestNestedSlidePage').then((module) => ({
        default: module.TestNestedSlidePage,
      })),
    ),
  },
};
