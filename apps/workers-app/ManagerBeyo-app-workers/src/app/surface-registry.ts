import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { caseSurfaces } from "@/features/cases/surfaces";
import { taskStepSurfaces } from "@/features/task_steps/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...caseSurfaces,
  ...taskStepSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
