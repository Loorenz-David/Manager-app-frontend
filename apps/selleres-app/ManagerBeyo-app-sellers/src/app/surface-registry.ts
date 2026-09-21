import { imageSurfaces } from "@beyo/images";
import { taskCreationSurfaces } from "@beyo/task-creation";
import { presentationSurfaces } from "@/app/presentation-surfaces";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { caseSurfaces } from "@/features/cases/surfaces";
import { pwaSurfaces } from "@/features/pwa/surfaces";
import { scannerSurfaces } from "@/features/scanner/surfaces";
import { taskSurfaces } from "@/features/tasks/surfaces";
import { stockReportSurfaces } from "@beyo/stock-report";

export const surfaceRegistry: SurfaceRegistrations = {
  ...caseSurfaces,
  ...taskCreationSurfaces,
  ...taskSurfaces,
  ...scannerSurfaces,
  ...imageSurfaces,
  ...pwaSurfaces,
  ...presentationSurfaces,
  ...stockReportSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
