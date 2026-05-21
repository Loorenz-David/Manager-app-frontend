import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

import { loadPhoneCountryPickerSheetPage } from './preload';

export const phoneInputSurfaces: SurfaceRegistrations = {
  'phone-country-picker': {
    surface: 'sheet',
    component: lazy(loadPhoneCountryPickerSheetPage),
  },
};
