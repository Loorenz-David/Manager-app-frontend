/**
 * ============================================================================
 * TEMPORARY — DELETE WHEN THE LOGIC PHASE LANDS
 * ============================================================================
 *
 * The Stock needs tab currently mounts the fixture-driven preview from
 * `@beyo/stock-report`, so the interface can be judged on a phone before any
 * endpoint, surface or controller exists. Nothing here fetches, reads a role or
 * opens a surface.
 *
 * The logic session replaces the body of this page with
 * `loadStockReportRouteEntryPage()` (the package's real route entry) and drops
 * the `StockReportFixturePreview` export from the package. The route, the tab
 * entries and this file's path all stay.
 */

import { lazy, Suspense } from "react";

import { PageSkeleton } from "@/components/ui/PageSkeleton";

const StockReportFixturePreview = lazy(() =>
  import("@beyo/stock-report").then((module) => ({
    default: module.StockReportFixturePreview,
  })),
);

export function StockReportPage(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<PageSkeleton />}>
        <StockReportFixturePreview />
      </Suspense>
    </div>
  );
}
