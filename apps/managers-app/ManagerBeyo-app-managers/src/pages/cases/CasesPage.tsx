import { lazy, Suspense } from "react";
import { useSurface } from "@beyo/hooks";
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CaseTaskInfoSheetContent } from "@/components/cases/CaseTaskInfoSheetContent";

const CasesRouteEntry = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  const { open: openSurface } = useSurface();

  const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
    openCaseFilters: (props) =>
      openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<PageSkeleton />}>
        <CasesRouteEntry
          surfaceOpeners={{
            renderLinkedTaskCard: (taskId) => (
              <CaseTaskInfoSheetContent taskId={taskId} />
            ),
          }}
          viewSurfaceOpeners={viewSurfaceOpeners}
        />
      </Suspense>
    </div>
  );
}
