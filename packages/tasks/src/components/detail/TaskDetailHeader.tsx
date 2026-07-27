import { m } from "framer-motion";
import { Calendar, ChevronLeft } from "lucide-react";

import { daysUntil, formatShortDate } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
  humanizeSnakeCase,
} from "../../lib/task-detail";
import type { TaskDetailRaw } from "../../types";

function DaysLeftPill({ days }: { days: number }): React.JSX.Element | null {
  if (Math.abs(days) > 99) {
    return null;
  }

  const label =
    days < 0
      ? "Overdue"
      : days === 0
        ? "Today"
        : `${days} ${days === 1 ? "day" : "days"}`;
  const className =
    "inline-flex shrink-0 items-center rounded-md bg-[var(--color-muted-foreground)] px-2 py-1 text-xs font-medium leading-none text-[var(--color-card)]";

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

type TaskDetailHeaderProps = {
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenReadyByAt?: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskDetailHeader({
  onBack,
  onOpenMenu,
  onOpenReadyByAt,
  taskDetail,
}: TaskDetailHeaderProps): React.JSX.Element | null {
  if (!taskDetail) {
    return null;
  }

  const { task, item } = taskDetail;
  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? "Article number missing")
    : "No item linked";
  const shouldRenderSkuRow =
    Boolean(item?.article_number) && Boolean(item?.sku);
  const skuLabel = item?.sku?.trim() ?? null;

  const TypeIcon = TASK_TYPE_ICON[task.task_type];
  const typeLabel = TASK_TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source
    ? RETURN_SOURCE_LABEL[task.return_source]
    : null;
  const readyByLabel = formatShortDate(task.ready_by_at ?? null) ?? "--";
  const days = daysUntil(task.ready_by_at ?? null);
  const readyByContent = (
    <>
      <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{task.ready_by_at ? readyByLabel : "select"}</span>
      {days !== null ? <DaysLeftPill days={days} /> : null}
    </>
  );

  return (
    <div className="flex flex-col gap-1  px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Page-native close: the slide surface renders no header here. */}
        <button
          aria-label="Go back"
          className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="task-detail-back-button"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <span className="min-w-0 flex-1 truncate text-md font-semibold text-foreground">
          {articleLabel}
        </span>
        <StatePill
          label={humanizeSnakeCase(task.state) ?? task.state}
          variant={TASK_STATE_VARIANT[task.state]}
        />
        <button
          aria-label="Task actions"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          type="button"
          onClick={onOpenMenu}
        >
          <span className="flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((index) => (
              <span key={index} className="size-1 rounded-full bg-current" />
            ))}
          </span>
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {shouldRenderSkuRow && skuLabel ? (
          <div className="text-sm text-muted-foreground">
            <span className="block min-w-0 truncate">{skuLabel}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {typeLabel}
            {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
          </span>
        </div>

        {onOpenReadyByAt ? (
          <button
            className="flex items-center gap-1.5 text-left text-xs text-muted-foreground"
            data-testid="task-detail-ready-by-trigger"
            type="button"
            onClick={onOpenReadyByAt}
          >
            {readyByContent}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{readyByLabel}</span>
            {days !== null ? <DaysLeftPill days={days} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
