import { lazy, Suspense } from "react";
import { useSurface } from "@beyo/hooks";
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";

import { PageSkeleton } from "@/components/ui/PageSkeleton";

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
    <Suspense fallback={<PageSkeleton />}>
      <CasesRouteEntry viewSurfaceOpeners={viewSurfaceOpeners} />
    </Suspense>
  );
}
