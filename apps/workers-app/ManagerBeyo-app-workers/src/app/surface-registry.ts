import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { taskCreationSurfaces } from "@beyo/task-creation";
import { presentationSurfaces } from "@/app/presentation-surfaces";
import { caseSurfaces } from "@/features/cases/surfaces";
import { pwaSurfaces } from "@/features/pwa";
import { taskStepSurfaces } from "@/features/task_steps/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...taskCreationSurfaces,
  ...caseSurfaces,
  ...pwaSurfaces,
  ...taskStepSurfaces,
  ...presentationSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
