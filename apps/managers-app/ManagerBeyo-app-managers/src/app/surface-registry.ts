import { testSurfaces } from '@/features/test_feature';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
