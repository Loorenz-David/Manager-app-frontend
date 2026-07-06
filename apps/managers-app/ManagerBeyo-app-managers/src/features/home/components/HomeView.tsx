import { RotateCcw, ShoppingBag } from "lucide-react";

import { PostHandlingIcon } from "@beyo/assets";
import { AuthRole, useRole } from "@beyo/auth";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
  type ImageViewModel,
} from "@beyo/images";
import { CALENDAR_RANGE_PICKER_SURFACE_ID } from "@beyo/task-creation";
import { usePostHandlingCountsQuery } from "@beyo/tasks";

import { usePendingSeatCountsQuery } from "@/features/pending-upholstery/api/use-pending-seat-counts-query";
import { useOrderNeedsCountQuery } from "@/features/upholstery-ordering/api/use-upholstery-ordering-queries";
import { formatCompactCount } from "@/features/pending-upholstery/lib/format-compact-count";
import { PENDING_UPHOLSTERY_SLIDE_ID } from "@/features/pending-upholstery";
import {
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  type TaskPostHandlingPendingWarningSheetSurfaceProps,
  type TaskPostHandlingSlideSurfaceProps,
  preloadPinNotificationsSlideSurface,
  preloadTaskPostHandlingPendingWarningSheetSurface,
} from "@/features/tasks/surfaces";
import { UPHOLSTERY_ORDERING_SLIDE_ID } from "@/features/upholstery-ordering";
import { useSurface } from "@/hooks/use-surface";
import {
  useTaskCountsQuery,
  type QuickTaskAssignSurfaceProps,
} from "@beyo/task-working-sections";
import ThreadIcon from "@/assets/icons/thread-svgrepo-com.svg?react";
import ClipboardIcon from "@/assets/icons/ClipboardIcon.svg?react";

export function HomeView(): React.JSX.Element {
  const { hasRole } = useRole();
  const isSeller = hasRole(AuthRole.Seller);
  const isManager = hasRole(AuthRole.Manager);
  const countsQuery = usePendingSeatCountsQuery();
  const orderingCountQuery = useOrderNeedsCountQuery();
  const preOrderCountsQuery = useTaskCountsQuery({
    taskType: "pre_order",
    taskStates: "pending",
  });
  const returnCountsQuery = useTaskCountsQuery({
    taskType: "return",
    taskStates: "pending",
  });
  const postHandlingCountsQuery = usePostHandlingCountsQuery(
    isSeller ? "pending" : "pending,filled",
  );
  const surface = useSurface();
  const total = countsQuery.data
    ? countsQuery.data.missing_selection_total +
      countsQuery.data.missing_quantity_total
    : null;
  const countLabel = total !== null ? ` (${formatCompactCount(total)})` : "";
  const orderingCountLabel = orderingCountQuery.data
    ? ` (${formatCompactCount(orderingCountQuery.data.needs_ordering_count)})`
    : "";
  const preOrderCount = preOrderCountsQuery.data?.total ?? null;
  const returnCount = returnCountsQuery.data?.total ?? null;
  const postHandlingCount = postHandlingCountsQuery.data
    ? isSeller
      ? (postHandlingCountsQuery.data.pending ?? 0)
      : (postHandlingCountsQuery.data.pending ?? 0) +
        (postHandlingCountsQuery.data.filled ?? 0)
    : null;
  const postHandlingCountLabel =
    postHandlingCount !== null
      ? ` (${formatCompactCount(postHandlingCount)})`
      : "";

  function openQuickAssignSurface(
    taskType: QuickTaskAssignSurfaceProps["taskType"],
  ): void {
    surface.open(QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID, {
      taskType,
      surfaceOpeners: {
        closeSurface: () => surface.close(QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID),
        openTaskDetail: (taskId) =>
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
        openTaskActions: (taskId, itemId) => {
          preloadPinNotificationsSlideSurface();
          surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
        },
        openImageViewer: (taskId, itemClientId, images) => {
          if (!images.length) return;
          const viewModels: ImageViewModel[] = images.map((img, index) => ({
            clientId: img.client_id,
            linkClientId: null,
            entityType: "item" as ImageLinkEntityType,
            entityClientId: itemClientId ?? taskId,
            imageUrl: img.image_url,
            localObjectUrl: null,
            displayOrder: index,
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
          surface.open(IMAGE_VIEWER_SURFACE_ID, {
            images: viewModels,
            initialImageClientId: viewModels[0].clientId,
            entityType: "item",
            entityClientId: itemClientId ?? taskId,
            mode: "preview-only",
          });
        },
      },
    } satisfies QuickTaskAssignSurfaceProps);
  }

  function openTaskPostHandlingSurface(): void {
    surface.open(TASK_POST_HANDLING_SLIDE_SURFACE_ID, {
      defaultTab: isSeller ? "pending" : isManager ? "filled" : "pending",
      surfaceOpeners: {
        closeSurface: () => surface.close(TASK_POST_HANDLING_SLIDE_SURFACE_ID),
        openTaskDetail: (taskId) =>
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
        openTaskActions: (taskId, itemId) => {
          preloadPinNotificationsSlideSurface();
          surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
        },
        openImageViewer: (taskId, itemClientId, images) => {
          if (!images.length) return;
          const viewModels: ImageViewModel[] = images.map((img, index) => ({
            clientId: img.client_id,
            linkClientId: null,
            entityType: "item" as ImageLinkEntityType,
            entityClientId: itemClientId ?? taskId,
            imageUrl: img.image_url,
            localObjectUrl: null,
            displayOrder: index,
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
          surface.open(IMAGE_VIEWER_SURFACE_ID, {
            images: viewModels,
            initialImageClientId: viewModels[0].clientId,
            entityType: "item",
            entityClientId: itemClientId ?? taskId,
            mode: "preview-only",
          });
        },
        openPendingWarning: (props) => {
          surface.open(
            TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
            props satisfies TaskPostHandlingPendingWarningSheetSurfaceProps,
          );
        },
        openCalendarRangePicker: (props) => {
          surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props);
        },
        preloadPendingWarningSheet:
          preloadTaskPostHandlingPendingWarningSheetSurface,
      },
    } satisfies TaskPostHandlingSlideSurfaceProps);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-10">
      <h1 className="text-2xl font-bold">Home</h1>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="relative flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left text-primary shadow-sm"
          data-testid="home-quick-preorders-box"
          type="button"
          onClick={() => openQuickAssignSurface("pre_order")}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft-container">
            <ShoppingBag
              aria-hidden="true"
              className="size-5 text-primary/90"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Pre-orders</p>
          </div>
          {preOrderCount !== null && preOrderCount > 0 && (
            <div className="absolute -right-2 -top-2">
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-card">
                {formatCompactCount(preOrderCount)}
              </span>
            </div>
          )}
        </button>

        <button
          className="relative flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left text-primary shadow-sm"
          data-testid="home-quick-returns-box"
          type="button"
          onClick={() => openQuickAssignSurface("return")}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft-container">
            <RotateCcw aria-hidden="true" className="size-5 text-primary/90" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Returns</p>
          </div>
          {returnCount !== null && returnCount > 0 && (
            <div className="absolute -right-2 -top-2">
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-card">
                {formatCompactCount(returnCount)}
              </span>
            </div>
          )}
        </button>
      </div>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        type="button"
        onClick={() => surface.open(PENDING_UPHOLSTERY_SLIDE_ID, {})}
      >
        <span>Select upholstery{countLabel}</span>
        <div className="flex ml-auto">
          <ThreadIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        type="button"
        onClick={() => surface.open(UPHOLSTERY_ORDERING_SLIDE_ID, {})}
      >
        <span>Ordering{orderingCountLabel}</span>
        <div className="flex ml-auto">
          <ClipboardIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        data-testid="home-post-handling-box"
        type="button"
        onClick={openTaskPostHandlingSurface}
      >
        <span>Items Ready{postHandlingCountLabel}</span>
        <div className="ml-auto flex">
          <PostHandlingIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
    </div>
  );
}
