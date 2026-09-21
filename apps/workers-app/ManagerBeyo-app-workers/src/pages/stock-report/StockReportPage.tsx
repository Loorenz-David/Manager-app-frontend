import { lazy, Suspense } from "react";
import { loadStockReportRouteEntryPage, StockReportOpenersProvider } from "@beyo/stock-report";
import { useSurface } from "@beyo/hooks";
import { TASK_CREATION_WORKER_INTERNAL_SURFACE_ID } from "@beyo/task-creation";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const StockReportRouteEntry = lazy(loadStockReportRouteEntryPage);

export function StockReportPage(): React.JSX.Element {
  const { open } = useSurface();
  return <div className="flex h-full min-h-0 flex-col"><Suspense fallback={<PageSkeleton />}><StockReportOpenersProvider openers={{ openTaskCreation: (_stockNeedId, callbacks) => open(TASK_CREATION_WORKER_INTERNAL_SURFACE_ID, { callbacks }) }}><StockReportRouteEntry /></StockReportOpenersProvider></Suspense></div>;
}
