import { m } from "framer-motion";
import { Calendar, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STEP_STATE_VARIANT, humanizeStepState } from "@beyo/tasks";
import { StatePill } from "@beyo/ui";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

const TYPE_ICON: Record<string, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

const TYPE_LABEL: Record<string, string> = {
  return: "Return",
  pre_order: "Pre-order",
  internal: "Internal",
};

const RETURN_SOURCE_LABEL: Record<string, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};


function formatDateDDMMYY(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function daysUntil(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const targetDate = new Date(value);
  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  return Math.round(diffMs / 86_400_000);
}

function ThreeDotIcon(): React.JSX.Element {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {[0, 1, 2].map((index) => (
        <span key={index} className="size-1 rounded-full bg-current" />
      ))}
    </span>
  );
}

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
    "inline-flex shrink-0 items-center rounded-md bg-muted-foreground px-2 py-1 text-xs font-medium leading-none text-card";

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

export function TaskStepDetailHeader(): React.JSX.Element | null {
  const { vm, handleOpenActionsSheet } = useTaskStepDetailContext();

  if (!vm) {
    return null;
  }

  const TypeIcon = TYPE_ICON[vm.task.task_type] ?? Wrench;
  const typeLabel = TYPE_LABEL[vm.task.task_type] ?? vm.task.task_type;
  const returnSourceLabel = vm.task.return_source
    ? RETURN_SOURCE_LABEL[vm.task.return_source]
    : null;
  const readyByLabel = formatDateDDMMYY(vm.task.ready_by_at ?? null);
  const days = daysUntil(vm.task.ready_by_at ?? null);

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3"
      data-testid="task-step-detail-header"
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-md font-semibold text-foreground">
          {vm.articleLabel}
        </span>

        <StatePill
          label={humanizeStepState(vm.state) || vm.state}
          variant={STEP_STATE_VARIANT[vm.state]}
        />
        <button
          type="button"
          aria-label="Task actions"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-light-border bg-card text-muted-foreground shadow-sm"
          onClick={handleOpenActionsSheet}
        >
          <ThreeDotIcon />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {typeLabel}
          {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
        </span>
      </div>

      {readyByLabel ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{readyByLabel}</span>
          {days !== null ? <DaysLeftPill days={days} /> : null}
        </div>
      ) : null}
    </div>
  );
}
