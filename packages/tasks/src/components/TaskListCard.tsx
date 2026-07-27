import { memo } from "react";
import { m } from "framer-motion";
import { Calendar, Check, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn, daysUntil } from "@beyo/lib";
import { BackendImage, ImagePlaceholder, StatePill } from "@beyo/ui";
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

function DaysLeftPill({ days }: { days: number }): React.JSX.Element | null {
  // The countdown pill only shows once ready_by_at is within 7 days
  // (current date >= ready_by_at - 7 days). The overdue pill (days < 0)
  // keeps rendering independently, capped at 99 days overdue.
  if (days > 7 || days < -99) {
    return null;
  }

  const label =
    days < 0
      ? "Overdue"
      : days === 0
        ? "Today"
        : `${days} ${days === 1 ? "day" : "days"}`;
  const className =
    "inline-flex shrink-0 items-center rounded-md bg-[#8f3a33] px-2 py-1 text-xs font-medium leading-none text-white";

  if (days < 0) {
    return <span className={className}>{label}</span>;
  }

  if (days < 3) {
    return (
      <m.span
        animate={{ scale: [1, 1.06, 1] }}
        className="inline-flex shrink-0 origin-center transform-gpu will-change-transform"
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className={className}>{label}</span>
      </m.span>
    );
  }

  return <span className={className}>{label}</span>;
}

export type TaskListCardProps = {
  taskId: string;
  task: {
    task_type: TaskType;
    state: TaskState;
    return_source: TaskReturnSource | null;
    ready_by_at: string | null;
    assortment?: string | null;
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
  /**
   * Action rendered detached below the card (post-handling style), as opposed
   * to `bottomAction` which sits inside the card under a divider.
   */
  detachedAction?: React.ReactNode;
  /** Labels of the values still missing, rendered as a dashed chip band. */
  missingValues?: string[];
  /** Makes the missing-values band tappable, e.g. to open the fill-in form. */
  onMissingValuesPress?: () => void;
  /** Extra content rendered inside the card body, below the ready-by row. */
  bodyExtra?: React.ReactNode;
  statePill?: { label: string; variant: StatePillVariant };
  typeIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  showAssortment?: boolean;
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
  detachedAction,
  missingValues,
  onMissingValuesPress,
  bodyExtra,
  statePill,
  typeIcon,
  showAssortment = false,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
}: TaskListCardProps): React.JSX.Element {
  const TypeIcon: LucideIcon = TASK_TYPE_ICON[task.task_type] ?? ShoppingBag;
  const ResolvedTypeIcon = typeIcon ?? TypeIcon;
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
  const assortment = task.assortment?.trim();
  const days = daysUntil(task.ready_by_at);
  const stateLabel = humanizeSnakeCase(task.state) ?? task.state;
  const stateVariant: StatePillVariant =
    TASK_STATE_VARIANT[task.state] ?? "neutral";
  const imageButtonClassName = onTapImage
    ? "cursor-pointer"
    : "cursor-default pointer-events-none";
  const hasBodyAction = Boolean(onTapCard);
  const bodyClassName = hasBodyAction ? "cursor-pointer" : "cursor-default";
  const pendingValues = batchMode ? [] : (missingValues ?? []);

  return (
    <div className="flex flex-col gap-2">
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
            <BackendImage
              className="size-full object-cover"
              fallback={
                <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
              }
              src={imageUrl}
            />

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
                <StatePill
                  label={statePill?.label ?? stateLabel}
                  variant={statePill?.variant ?? stateVariant}
                />
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
              <ResolvedTypeIcon
                aria-hidden="true"
                className="size-4 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate">
                {typeLabel}
                {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
              </span>
            </div>

            {readyByLabel ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
                <span>{readyByLabel}</span>
                {days !== null ? <DaysLeftPill days={days} /> : null}
              </div>
            ) : null}

            {bodyExtra}

            {showAssortment && assortment ? (
              <div
                className="mt-2.5 flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-soft-container px-3 py-2.5"
                data-testid={`tasks-card-assortment-${taskId}`}
              >
                <span className="min-w-0 text-[0.6875rem] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                  Final placement
                </span>
                <span className="min-w-0 truncate text-2xl font-bold leading-none text-foreground">
                  {assortment}
                </span>
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

        {pendingValues.length > 0 ? (
          <button
            aria-label={
              pendingValues.length === 1
                ? "Fill in the missing value"
                : "Fill in the missing values"
            }
            className={cn(
              "w-full border-t border-dashed border-[#e2cf9d] bg-[#fdf7e6] px-4 py-3 text-left",
              onMissingValuesPress
                ? "cursor-pointer transition active:bg-[#faefd2]"
                : "cursor-default",
            )}
            data-testid={`tasks-card-missing-values-${taskId}`}
            disabled={!onMissingValuesPress}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMissingValuesPress?.();
            }}
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-warning">
                {`Needs #${pendingValues.length} ${
                  pendingValues.length === 1 ? "value" : "values"
                }`}
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-[#e2cf9d]" />
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {pendingValues.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#c9a34a] px-3 py-1.5 text-sm font-medium text-foreground"
                >
                  {label}
                  <span
                    aria-hidden="true"
                    className="h-px w-6 shrink-0 bg-[#c9a34a]"
                  />
                </span>
              ))}
            </div>
          </button>
        ) : null}

        {!batchMode && bottomAction ? (
          <div className="border-t border-border">{bottomAction}</div>
        ) : null}
      </div>

      {!batchMode && detachedAction ? (
        <div className="mx-4">{detachedAction}</div>
      ) : null}
    </div>
  );
});
