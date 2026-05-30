import { usePreloadSurface } from "@beyo/hooks";
import { CaseCreationRouteEntry } from "@beyo/cases";
import { preloadImageCameraSurface } from "@beyo/images";

import {
  preloadCaseTypePickerSheetSurface,
  preloadParticipantPickerSlideSurface,
} from "@/features/cases/surfaces";

export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);
  usePreloadSurface(preloadImageCameraSurface);
  usePreloadSurface(preloadParticipantPickerSlideSurface);

  return <CaseCreationRouteEntry />;
}
