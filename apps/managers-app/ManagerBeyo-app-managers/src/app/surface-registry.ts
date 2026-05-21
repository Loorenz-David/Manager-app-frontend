import { calendarSurfaces } from '@/components/primitives/date/surfaces';
import { itemSurfaces } from '@/features/items';
import { testingFormsSurfaces } from '@/features/testing_forms';
import { testSurfaces } from '@/features/test_feature';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
