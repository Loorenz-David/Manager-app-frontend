import { lazy, Suspense } from "react";
import { loadStockReportRouteEntryPage, STOCK_MATCH_WARNING_SURFACE_ID, StockReportOpenersProvider } from "@beyo/stock-report";
import { useSurface } from "@beyo/hooks";
import { IMAGE_VIEWER_SURFACE_ID, type ImageLinkEntityType, type ImageViewModel } from "@beyo/images";
import { TASK_CREATION_WORKER_INTERNAL_SURFACE_ID } from "@beyo/task-creation";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const StockReportRouteEntry = lazy(loadStockReportRouteEntryPage);

export function StockReportPage(): React.JSX.Element {
  const { open } = useSurface();
  const openImageViewer = (taskId: string, itemId: string | null, images: Array<{ clientId: string; imageUrl: string }>) => {
    const viewModels: ImageViewModel[] = images.map((image, displayOrder) => ({ clientId: image.clientId, linkClientId: null, entityType: "item" as ImageLinkEntityType, entityClientId: itemId ?? taskId, imageUrl: image.imageUrl, localObjectUrl: null, displayOrder, widthPx: null, heightPx: null, fileSizeBytes: null, createdAt: null, uploadState: "completed", isOptimistic: false, isDeleted: false, pendingUploadClientId: null, uploadError: null, annotation: null, annotations: [] }));
    const first = viewModels[0];
    if (first) open(IMAGE_VIEWER_SURFACE_ID, { images: viewModels, initialImageClientId: first.clientId, entityType: "item", entityClientId: itemId ?? taskId, mode: "preview-only" });
  };
  return <div className="flex h-full min-h-0 flex-col"><Suspense fallback={<PageSkeleton />}><StockReportOpenersProvider openers={{
    openTaskCreation: (_stockNeedId, callbacks) => open(TASK_CREATION_WORKER_INTERNAL_SURFACE_ID, { callbacks }),
    openImageViewer,
    openMatchWarning: (props) => open(STOCK_MATCH_WARNING_SURFACE_ID, props, { dismissible: false }),
  }}><StockReportRouteEntry /></StockReportOpenersProvider></Suspense></div>;
}
