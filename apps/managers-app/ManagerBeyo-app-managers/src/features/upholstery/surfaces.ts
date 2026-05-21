import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

function loadUpholsteryPickerSlidePage() {
  return import('@/features/upholstery/pages/UpholsteryPickerSlidePage').then((module) => ({
    default: module.UpholsteryPickerSlidePage,
  }));
}

export const upholsterySurfaces: SurfaceRegistrations = {
  'upholstery-picker': {
    surface: 'slide',
    component: lazy(loadUpholsteryPickerSlidePage),
  },
};
