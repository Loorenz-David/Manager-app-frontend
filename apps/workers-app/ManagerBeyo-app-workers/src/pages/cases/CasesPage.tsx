import { lazy, Suspense } from "react";

import { PageSkeleton } from "@/components/ui/PageSkeleton";

const CasesRouteEntry = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CasesRouteEntry />
    </Suspense>
  );
}
