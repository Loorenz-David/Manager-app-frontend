import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { caseSurfaces } from "@/features/cases/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...caseSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
