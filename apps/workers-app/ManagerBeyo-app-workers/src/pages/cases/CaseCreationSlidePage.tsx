import { usePreloadSurface } from "@beyo/hooks";
import { CaseCreationRouteEntry } from "@beyo/cases";
import { preloadImageCameraSurface } from "@beyo/images";

import { preloadCaseTypePickerSheetSurface } from "@/features/cases/surfaces";

export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);
  usePreloadSurface(preloadImageCameraSurface);

  return <CaseCreationRouteEntry />;
}
