import { calendarSurfaces } from "@/components/primitives/date/surfaces";
import { caseSurfaces } from "@/features/cases/surfaces";
import { imageSurfaces } from "@beyo/images";
import { itemSurfaces } from "@/features/items";
import { phoneInputSurfaces } from "@/features/phone-input";
import { pendingUpholsterySurfaces } from "@/features/pending-upholstery";
import { pwaSurfaces } from "@/features/pwa/surfaces";
import { taskSurfaces } from "@/features/tasks";
import { taskCreationSurfaces } from "@/features/task-creation";
import { testingFormsSurfaces } from "@/features/testing_forms";
import { testSurfaces } from "@/features/test_feature";
import { upholsterySurfaces } from "@/features/upholstery";
import { upholsteryInventorySurfaces } from "@/features/upholstery-inventory";
import { upholsteryOrderingSurfaces } from "@/features/upholstery-ordering";
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
  ...pendingUpholsterySurfaces,
  ...upholsteryOrderingSurfaces,
  ...upholsteryInventorySurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...pwaSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
