import { memo } from "react";
import { Calendar, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@/components/primitives";
import type { StatePillVariant } from "@/components/primitives";
import type { Item } from "@/features/items/types";

import { formatLocalDateYYMMDD } from "../lib/task-detail";
import type {
  TaskCardViewModel,
  TaskReturnSource,
  TaskState,
  TaskType,
} from "../types";

const TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

const TYPE_LABEL: Record<TaskType, string> = {
  return: "Return",
  pre_order: "Pre-order",
  internal: "Internal",
};

const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};

const STATE_VARIANT: Record<TaskState, StatePillVariant> = {
  pending: "neutral",
  assigned: "active",
  working: "active",
  stalled: "warning",
  ready: "success",
  resolved: "success",
  failed: "danger",
  cancelled: "neutral",
};

function toTitleCaseLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getQuantityPillLabel(item: Item | null): string | null {
  if (!item) {
    return null;
  }

  if (item.item_major_category_snapshot?.toLowerCase() === "seat") {
    return `#${item.quantity}`;
  }

  return null;
}

type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: (taskId: string) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
  bottomAction?: React.ReactNode;
};

export const TaskListCard = memo(function TaskListCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
  bottomAction,
}: TaskListCardProps): React.JSX.Element {
  const { taskId, task, item, firstImage } = card;
  const TypeIcon = TYPE_ICON[task.task_type];
  const typeLabel = TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source
    ? RETURN_SOURCE_LABEL[task.return_source]
    : null;
  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? "Article number missing")
    : "No item linked";
  const imageUrl = firstImage
    ? (firstImage.localObjectUrl ?? firstImage.imageUrl)
    : null;
  const quantityPillLabel = getQuantityPillLabel(item);
  const readyByLabel = formatLocalDateYYMMDD(task.ready_by_at);

  return (
    <div
      className="mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`tasks-card-${taskId}`}
    >
      <div className="flex">
        <button
          aria-label="View item image"
          className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
          data-testid={`tasks-card-image-${taskId}`}
          type="button"
          onClick={() => onTapImage(taskId)}
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
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
          data-testid={`tasks-card-body-${taskId}`}
          role="button"
          tabIndex={0}
          onClick={() => onTapCard(taskId)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onTapCard(taskId);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium text-foreground">
              {articleLabel}
            </span>

            <StatePill
              label={toTitleCaseLabel(task.state)}
              variant={STATE_VARIANT[task.state]}
            />

            <button
              aria-label="Task actions"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
              data-testid={`tasks-card-actions-${taskId}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTapActions(taskId);
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
              {task.is_overdue ? (
                <span className="ml-1 inline-flex items-center rounded-md bg-[#8f3a33] px-2 py-0.5 text-[11px] font-medium text-white">
                  Overdue
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {bottomAction ? (
        <div className="border-t border-border">{bottomAction}</div>
      ) : null}
    </div>
  );
});
