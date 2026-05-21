import { calendarSurfaces } from '@/components/primitives/date/surfaces';
import { imageSurfaces } from '@/features/images';
import { itemSurfaces } from '@/features/items';
import { phoneInputSurfaces } from '@/features/phone-input';
import { testingFormsSurfaces } from '@/features/testing_forms';
import { testSurfaces } from '@/features/test_feature';
import { upholsterySurfaces } from '@/features/upholstery';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
