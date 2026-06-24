import { memo } from "react";
import { Calendar, Check } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { cn } from "@beyo/lib";
import { ImageAnnotationSvgLayer } from "@beyo/images";
import { ImagePlaceholder } from "@beyo/ui";
import { getTaskTypeIcon, getTaskTypeLabel } from "../domain/task-type-meta";
import type { TaskStepCardViewModel } from "../types";

type BatchSelectableTaskStepCardProps = {
  card: TaskStepCardViewModel;
  selected: boolean;
  onToggleSelect: (stepId: TaskStepId) => void;
  onTapImage: (stepId: TaskStepId) => void;
  onTapCard: (stepId: TaskStepId, taskId: TaskId) => void;
};

export const BatchSelectableTaskStepCard = memo(
  function BatchSelectableTaskStepCard({
    card,
    selected,
    onToggleSelect,
    onTapImage,
    onTapCard,
  }: BatchSelectableTaskStepCardProps): React.JSX.Element {
    const {
      stepId,
      taskId,
      task,
      firstImageUrl,
      articleLabel,
      itemPositionPillLabel,
      quantityPillLabel,
    } = card;

    const TypeIcon = getTaskTypeIcon(task.task_type);
    const typeLabel = getTaskTypeLabel(task.task_type);
    const readyByLabel = task.ready_by_at
      ? new Date(task.ready_by_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
      : null;
    const unreadCount = card.casesSummary?.total_unread ?? 0;

    return (
      <div
        className={cn(
          "mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm border-soft-container ring-1",
          selected ? "ring-primary" : "ring-transparent",
        )}
        data-testid={`batch-step-card-${stepId}`}
      >
        {/* Thumbnail — inlined from TaskStepCard's StepThumbnail (pure visual, no business logic) */}
        <button
          aria-label="View item image"
          className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
          data-testid={`batch-step-card-image-${stepId}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTapImage(stepId);
          }}
        >
          {firstImageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={firstImageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
          )}
          <ImageAnnotationSvgLayer
            annotations={card.firstImageAnnotations}
            coverMode
            heightPx={card.firstImageHeightPx}
            widthPx={card.firstImageWidthPx}
          />
          {itemPositionPillLabel ? (
            <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              {itemPositionPillLabel}
            </span>
          ) : null}
          {quantityPillLabel ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              {quantityPillLabel}
            </span>
          ) : null}
        </button>

        {/* Body — tapping opens task detail */}
        <div
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
          data-testid={`batch-step-card-body-${stepId}`}
          role="button"
          tabIndex={0}
          onClick={() => onTapCard(stepId, taskId)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onTapCard(stepId, taskId);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {articleLabel}
            </span>
            {unreadCount > 0 ? (
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
                data-testid={`batch-card-cases-badge-${stepId}`}
              >
                {unreadCount}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{typeLabel}</span>
          </div>

          {readyByLabel ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{readyByLabel}</span>
            </div>
          ) : null}
        </div>

        {/* Selection column — stopPropagation prevents bubbling to card body's onTapCard */}
        <button
          aria-label={selected ? "Deselect step" : "Select step"}
          aria-pressed={selected}
          className={cn(
            "flex w-14 shrink-0 items-center justify-center border-l border-border",
            selected ? "bg-primary text-card" : "text-muted-foreground",
          )}
          data-testid={`batch-step-card-select-${stepId}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(stepId);
          }}
        >
          <Check aria-hidden="true" className="size-5" />
        </button>
      </div>
    );
  },
);
