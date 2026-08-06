import { caseSurfaces } from "@/features/cases/surfaces";
import { imageSurfaces } from "@beyo/images";
import { itemSurfaces } from "@/features/items";
import { phoneInputSurfaces } from "@/features/phone-input";
import { pendingUpholsterySurfaces } from "@/features/pending-upholstery";
import { pwaSurfaces } from "@/features/pwa/surfaces";
import { presentationSurfaces } from "@/app/presentation-surfaces";
import { shopifyIntegrationsSurfaces } from "@/features/shopify-integrations/surfaces";
import { taskSurfaces } from "@/features/tasks";
import { taskCreationSurfaces } from "@beyo/task-creation";
import { workerStatsSurfaces } from "@beyo/stats";
import { testingFormsSurfaces } from "@/features/testing_forms";
import { testSurfaces } from "@/features/test_feature";
import { upholsteryCategorySurfaces } from "@/features/upholstery-category";
import { upholsterySurfaces } from "@beyo/upholstery";
import { upholsteryInventorySurfaces } from "@/features/upholstery-inventory";
import { upholsteryOrderingSurfaces } from "@/features/upholstery-ordering";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...caseSurfaces,
  ...testingFormsSurfaces,
  ...taskCreationSurfaces,
  ...workerStatsSurfaces,
  ...taskSurfaces,
  ...itemSurfaces,
  ...pendingUpholsterySurfaces,
  ...upholsteryOrderingSurfaces,
  ...upholsteryInventorySurfaces,
  ...upholsteryCategorySurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...pwaSurfaces,
  ...presentationSurfaces,
  ...shopifyIntegrationsSurfaces,
  ...upholsterySurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
