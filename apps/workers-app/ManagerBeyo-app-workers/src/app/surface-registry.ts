import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { taskCreationSurfaces } from "@beyo/task-creation";
import { presentationSurfaces } from "@/app/presentation-surfaces";
import { caseSurfaces } from "@/features/cases/surfaces";
import { homeSurfaces } from "@/features/home/surfaces";
import { pwaSurfaces } from "@/features/pwa";
import { taskStepSurfaces } from "@/features/task_steps/surfaces";
import { stockReportSurfaces } from "@beyo/stock-report";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...taskCreationSurfaces,
  ...caseSurfaces,
  ...homeSurfaces,
  ...pwaSurfaces,
  ...taskStepSurfaces,
  ...presentationSurfaces,
  ...stockReportSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
