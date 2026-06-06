import { memo } from "react";
import { Calendar } from "lucide-react";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { ImageAnnotationSvgLayer } from "@beyo/images";
import { ImagePlaceholder } from "@beyo/ui";
import { getTaskTypeIcon, getTaskTypeLabel } from "../domain/task-type-meta";
import type { StepState, TaskStepCardViewModel } from "../types";
import { TaskStepActionButton } from "./TaskStepActionButton";

const RETURN_SOURCE_LABEL: Record<string, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};

type StepThumbnailProps = {
  stepId: TaskStepId;
  src: string | null;
  annotations: TaskStepCardViewModel["firstImageAnnotations"];
  widthPx: number | null;
  heightPx: number | null;
  itemPositionPillLabel: string | null;
  quantityPillLabel: string | null;
  onTap: (stepId: TaskStepId) => void;
};

const StepThumbnail = memo(function StepThumbnail({
  stepId,
  src,
  annotations,
  widthPx,
  heightPx,
  itemPositionPillLabel,
  quantityPillLabel,
  onTap,
}: StepThumbnailProps): React.JSX.Element {
  return (
    <button
      aria-label="View item image"
      className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
      data-testid={`task-step-card-image-${stepId}`}
      type="button"
      onClick={() => onTap(stepId)}
    >
      {src ? (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          loading="lazy"
          src={src}
        />
      ) : (
        <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
      )}
      <ImageAnnotationSvgLayer
        annotations={annotations}
        coverMode
        heightPx={heightPx}
        widthPx={widthPx}
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
  );
});

function ThreeDotIcon(): React.JSX.Element {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1 rounded-full bg-current" />
      ))}
    </span>
  );
}

type TaskStepCardProps = {
  card: TaskStepCardViewModel;
  onTapImage: (stepId: TaskStepId) => void;
  onTapActions: (stepId: TaskStepId, taskId: TaskId) => void;
  onTapCard: (stepId: TaskStepId, taskId: TaskId) => void;
  onTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  transitioningStepId: TaskStepId | null;
};

export const TaskStepCard = memo(function TaskStepCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
  onTransition,
  transitioningStepId,
}: TaskStepCardProps): React.JSX.Element {
  const {
    stepId,
    taskId,
    task,
    firstImageUrl,
    articleLabel,
    itemPositionPillLabel,
    quantityPillLabel,
    lastStateRecord,
  } = card;
  const isTransitioning = transitioningStepId === stepId;
  const TypeIcon = getTaskTypeIcon(task.task_type);
  const typeLabel = getTaskTypeLabel(task.task_type);
  const returnSourceLabel = task.return_source
    ? RETURN_SOURCE_LABEL[task.return_source]
    : null;
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
      className="mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm border-soft-container"
      data-testid={`task-step-card-${stepId}`}
    >
      <div className="flex">
        <StepThumbnail
          annotations={card.firstImageAnnotations}
          heightPx={card.firstImageHeightPx}
          itemPositionPillLabel={itemPositionPillLabel}
          quantityPillLabel={quantityPillLabel}
          src={firstImageUrl}
          stepId={stepId}
          widthPx={card.firstImageWidthPx}
          onTap={onTapImage}
        />

        <div
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
          data-testid={`task-step-card-body-${stepId}`}
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
                data-testid={`task-card-cases-badge-${stepId}`}
              >
                {unreadCount}
              </span>
            ) : null}
            <button
              aria-label="Task actions"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
              data-testid={`task-step-card-actions-${stepId}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTapActions(stepId, taskId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                }
              }}
            >
              <ThreeDotIcon />
            </button>
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {typeLabel}
              {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
            </span>
          </div>

          {readyByLabel ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{readyByLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      <TaskStepActionButton
        isTransitioning={isTransitioning}
        lastStateRecord={lastStateRecord}
        state={card.state}
        stepId={stepId}
        taskId={taskId}
        onTransition={onTransition}
      />
    </div>
  );
});
