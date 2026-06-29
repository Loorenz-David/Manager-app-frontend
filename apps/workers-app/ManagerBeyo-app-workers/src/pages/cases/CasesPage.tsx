import { lazy, Suspense } from "react";
import { useSurface } from "@beyo/hooks";
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";

import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useLastActiveStepCardContext } from "@/features/task_steps";

const LAST_ACTIVE_STEP_CARD_FAB_OFFSET_CLASS = "bottom-[100px]";

const CasesRouteEntry = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  const { open: openSurface } = useSurface();
  const { step, vm, batchVms, isBatchCard } = useLastActiveStepCardContext();
  const hasLastActiveStepCard = isBatchCard
    ? batchVms.length > 0
    : Boolean(step && vm);

  const caseCreationSurfaceOpeners: CaseCreationSurfaceOpeners = {
    openCaseTypePicker: (props) =>
      openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
    openParticipantPicker: (props) =>
      openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
  };

  const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
    openCaseFilters: (props) =>
      openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
    openCaseCreation: () =>
      openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
        surfaceOpeners: caseCreationSurfaceOpeners,
      }),
    createFabBottomOffsetClassName: hasLastActiveStepCard
      ? LAST_ACTIVE_STEP_CARD_FAB_OFFSET_CLASS
      : undefined,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<PageSkeleton />}>
        <CasesRouteEntry viewSurfaceOpeners={viewSurfaceOpeners} />
      </Suspense>
    </div>
  );
}
