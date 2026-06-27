import { memo } from "react";
import { Calendar, Check, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@beyo/lib";
import { ImagePlaceholder, StatePill } from "@beyo/ui";
import type { StatePillVariant } from "@beyo/ui";

import {
  formatLocalDateYYMMDD,
  humanizeSnakeCase,
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
} from "../lib/task-detail";
import type { TaskReturnSource, TaskState, TaskType } from "../types";

export type TaskListCardProps = {
  taskId: string;
  task: {
    task_type: TaskType;
    state: TaskState;
    return_source: TaskReturnSource | null;
    ready_by_at: string | null;
    is_overdue?: boolean;
  };
  item: {
    itemId: string | null;
    article_number: string | null;
    sku: string | null;
    item_major_category_snapshot: string | null;
    quantity: number;
  } | null;
  imageUrl: string | null;
  onTapImage?: (taskId: string) => void;
  onTapActions?: (taskId: string, itemId: string | null) => void;
  onTapCard?: (taskId: string) => void;
  bottomAction?: React.ReactNode;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
};

export const TaskListCard = memo(function TaskListCard({
  taskId,
  task,
  item,
  imageUrl,
  onTapImage,
  onTapActions,
  onTapCard,
  bottomAction,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
}: TaskListCardProps): React.JSX.Element {
  const TypeIcon: LucideIcon = TASK_TYPE_ICON[task.task_type] ?? ShoppingBag;
  const typeLabel = TASK_TYPE_LABEL[task.task_type] ?? task.task_type;
  const returnSourceLabel = task.return_source
    ? (RETURN_SOURCE_LABEL[task.return_source] ?? null)
    : null;
  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? "Article number missing")
    : "No item linked";
  const quantityPillLabel =
    item?.item_major_category_snapshot?.toLowerCase() === "seat"
      ? `#${item.quantity}`
      : null;
  const readyByLabel = formatLocalDateYYMMDD(task.ready_by_at);
  const stateLabel = humanizeSnakeCase(task.state) ?? task.state;
  const stateVariant: StatePillVariant =
    TASK_STATE_VARIANT[task.state] ?? "neutral";
  const isOverdue =
    task.is_overdue ?? (task.ready_by_at ? new Date(task.ready_by_at) < new Date() : false);
  const imageButtonClassName = onTapImage
    ? "cursor-pointer"
    : "cursor-default pointer-events-none";
  const hasBodyAction = Boolean(onTapCard);
  const bodyClassName = hasBodyAction ? "cursor-pointer" : "cursor-default";

  return (
    <div
      className={cn(
        "mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm",
        batchMode &&
          (isSelected ? "ring-1 ring-primary" : "ring-1 ring-transparent"),
      )}
      data-testid={`tasks-card-${taskId}`}
    >
      <div className="flex">
        <button
          aria-label={onTapImage ? "View item image" : undefined}
          className={`relative aspect-square w-28 shrink-0 overflow-hidden bg-muted ${imageButtonClassName}`}
          data-testid={`tasks-card-image-${taskId}`}
          disabled={!onTapImage}
          type="button"
          onClick={() => onTapImage?.(taskId)}
        >
          {imageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
          )}

          {quantityPillLabel ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              {quantityPillLabel}
            </span>
          ) : null}
        </button>

        <div
          className={`flex min-w-0 flex-1 flex-col justify-start px-3 py-2.5 ${bodyClassName}`}
          data-testid={`tasks-card-body-${taskId}`}
          role={hasBodyAction ? "button" : undefined}
          tabIndex={hasBodyAction ? 0 : undefined}
          onClick={() => onTapCard?.(taskId)}
          onKeyDown={(event) => {
            if (!hasBodyAction) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onTapCard?.(taskId);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium text-foreground">
              {articleLabel}
            </span>

            {!batchMode ? (
              <StatePill label={stateLabel} variant={stateVariant} />
            ) : null}

            {!batchMode && onTapActions ? (
              <button
                aria-label="Task actions"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                data-testid={`tasks-card-actions-${taskId}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTapActions(taskId, item?.itemId ?? null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.stopPropagation();
                  }
                }}
              >
                <span className="flex flex-col items-center gap-0.5">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="size-1 rounded-full bg-current"
                    />
                  ))}
                </span>
              </button>
            ) : null}
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
              {isOverdue ? (
                <span className="ml-1 inline-flex items-center rounded-md bg-[#8f3a33] px-2 py-0.5 text-[11px] font-medium text-white">
                  Overdue
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {batchMode ? (
          <button
            aria-label={isSelected ? "Deselect task" : "Select task"}
            aria-pressed={isSelected}
            className={cn(
              "flex w-14 shrink-0 items-center justify-center border-l border-border",
              isSelected ? "bg-primary text-card" : "text-muted-foreground",
            )}
            data-testid={`tasks-card-select-${taskId}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect?.(taskId);
            }}
          >
            <Check aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>
      {!batchMode && bottomAction ? (
        <div className="border-t border-border">{bottomAction}</div>
      ) : null}
    </div>
  );
});
