import { calendarSurfaces } from "@/components/primitives/date/surfaces";
import { caseSurfaces } from "@/features/cases/surfaces";
import { imageSurfaces } from "@beyo/images";
import { itemSurfaces } from "@/features/items";
import { phoneInputSurfaces } from "@/features/phone-input";
import { pwaSurfaces } from "@/features/pwa/surfaces";
import { taskSurfaces } from "@/features/tasks";
import { taskCreationSurfaces } from "@/features/task-creation";
import { testingFormsSurfaces } from "@/features/testing_forms";
import { testSurfaces } from "@/features/test_feature";
import { upholsterySurfaces } from "@/features/upholstery";
import { workingSectionSurfaces } from "@/features/working-sections";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...caseSurfaces,
  ...testingFormsSurfaces,
  ...taskCreationSurfaces,
  ...taskSurfaces,
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...pwaSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
