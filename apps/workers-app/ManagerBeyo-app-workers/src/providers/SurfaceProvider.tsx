import type { ReactNode } from "react";
import {
  SurfaceProvider as BaseSurfaceProvider,
  useSurfaceStore,
} from "@beyo/ui";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
  type ImageViewModel,
} from "@beyo/images";
import {
  STOCK_MATCH_WARNING_SURFACE_ID,
  StockReportOpenersProvider,
  type StockReportSurfaceOpeners,
} from "@beyo/stock-report";
import { TASK_CREATION_WORKER_INTERNAL_SURFACE_ID } from "@beyo/task-creation";
import { surfaceRegistry } from "@/app/surface-registry";

export {
  SurfacePropsContext,
  SurfaceHeaderContext,
  useSurfaceStore,
} from "@beyo/ui";
export type { SurfaceType, SurfaceRegistrations } from "@beyo/ui";

const stockReportOpeners: StockReportSurfaceOpeners = {
  openTaskCreation: (_stockNeedId, callbacks) =>
    useSurfaceStore
      .getState()
      .open(TASK_CREATION_WORKER_INTERNAL_SURFACE_ID, { callbacks }),
  openImageViewer: (taskId, itemId, images) => {
    const viewModels: ImageViewModel[] = images.map((image, displayOrder) => ({
      clientId: image.clientId,
      linkClientId: null,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: itemId ?? taskId,
      imageUrl: image.imageUrl,
      localObjectUrl: null,
      displayOrder,
      widthPx: null,
      heightPx: null,
      fileSizeBytes: null,
      createdAt: null,
      uploadState: "completed",
      isOptimistic: false,
      isDeleted: false,
      pendingUploadClientId: null,
      uploadError: null,
      annotation: null,
      annotations: [],
    }));
    const first = viewModels[0];
    if (first) {
      useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, {
        images: viewModels,
        initialImageClientId: first.clientId,
        entityType: "item",
        entityClientId: itemId ?? taskId,
        mode: "preview-only",
      });
    }
  },
  openMatchWarning: (props) =>
    useSurfaceStore
      .getState()
      .open(STOCK_MATCH_WARNING_SURFACE_ID, props, { dismissible: false }),
};

type SurfaceProviderProps = {
  children: ReactNode;
};

export function SurfaceProvider({
  children,
}: SurfaceProviderProps): React.JSX.Element {
  return (
    <StockReportOpenersProvider openers={stockReportOpeners}>
      <BaseSurfaceProvider registry={surfaceRegistry}>
        {children}
      </BaseSurfaceProvider>
    </StockReportOpenersProvider>
  );
}
