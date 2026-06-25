import { useCallback } from "react";
import { ChevronRight } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@/components/primitives";
import { useSurface } from "@/hooks/use-surface";
import { IMAGE_VIEWER_SURFACE_ID } from "@beyo/images";
import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_LABEL,
  humanizeSnakeCase,
} from "@beyo/tasks";
import type { GetTaskResult } from "@/features/tasks/api/get-task";

type CaseTaskInfoCardProps = {
  taskDetail: GetTaskResult;
  onOpenTask: () => void;
};

function getPrimaryReference(taskDetail: GetTaskResult): string {
  return (
    taskDetail.item?.article_number ??
    taskDetail.item?.sku ??
    "Article number missing"
  );
}

export function CaseTaskInfoCard({
  taskDetail,
  onOpenTask,
}: CaseTaskInfoCardProps): React.JSX.Element {
  const surface = useSurface();
  const firstImage = taskDetail.item_images[0] ?? null;
  const imageUrl = firstImage?.image_url ?? null;
  const primaryReference = getPrimaryReference(taskDetail);
  const taskTypeLabel = TASK_TYPE_LABEL[taskDetail.task.task_type];
  const returnSourceLabel = taskDetail.task.return_source
    ? RETURN_SOURCE_LABEL[taskDetail.task.return_source]
    : null;
  const stateLabel = humanizeSnakeCase(taskDetail.task.state) ?? "Unknown";

  const handleOpenImage = useCallback(() => {
    if (!firstImage) {
      return;
    }

    const entityClientId = taskDetail.item?.client_id ?? null;

    surface.open(IMAGE_VIEWER_SURFACE_ID, {
      images: [
        {
          clientId: firstImage.client_id,
          linkClientId: null,
          entityType: "item",
          entityClientId,
          imageUrl: firstImage.image_url,
          localObjectUrl: null,
          displayOrder: 0,
          widthPx: firstImage.width_px ?? null,
          heightPx: firstImage.height_px ?? null,
          fileSizeBytes: firstImage.file_size_bytes ?? null,
          createdAt: taskDetail.task.created_at,
          uploadState: "completed",
          isOptimistic: false,
          isDeleted: false,
          pendingUploadClientId: null,
          uploadError: null,
          annotation: null,
          annotations: [],
        },
      ],
      initialImageClientId: firstImage.client_id,
      entityType: "item",
      entityClientId,
      mode: "preview-only",
      enableOnDemandImageLoad: false,
    });
  }, [
    firstImage,
    surface,
    taskDetail.task.created_at,
    taskDetail.item?.client_id,
  ]);

  return (
    <div
      aria-label="Open task detail"
      className="flex w-full items-stretch gap-3 rounded-3xl border border-border bg-card p-3 text-left shadow-sm transition-colors duration-150 hover:bg-muted/40"
      data-testid="case-task-info-card"
      role="button"
      tabIndex={0}
      onClick={onOpenTask}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenTask();
        }
      }}
    >
      <button
        aria-label="Open task image preview"
        className="flex aspect-square w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-muted"
        data-testid="case-task-info-image"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleOpenImage();
        }}
      >
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            src={imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {primaryReference}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {taskTypeLabel}
              {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
            </p>
            {taskDetail.item?.article_number && taskDetail.item?.sku ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                SKU {taskDetail.item.sku}
              </p>
            ) : null}
          </div>

          <div data-testid="case-task-info-state">
            <StatePill
              label={stateLabel}
              variant={TASK_STATE_VARIANT[taskDetail.task.state]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Open full task details</span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}
