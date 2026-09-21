import { lazy, Suspense } from "react";
import { loadStockReportRouteEntryPage, StockReportOpenersProvider } from "@beyo/stock-report";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const StockReportRouteEntry = lazy(loadStockReportRouteEntryPage);

export function StockReportPage(): React.JSX.Element {
  return <div className="flex h-full min-h-0 flex-col"><Suspense fallback={<PageSkeleton />}><StockReportOpenersProvider openers={{}}><StockReportRouteEntry /></StockReportOpenersProvider></Suspense></div>;
}
