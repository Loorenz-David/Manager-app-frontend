import { Clock } from "lucide-react";
import { cn } from "@beyo/lib";

import type { TaskBudgetOverrunViewModel } from "../../lib/task-budget-overrun";

export type TaskBudgetOverrunBandProps = {
  overrun: TaskBudgetOverrunViewModel;
  /**
   * "567 kr" — omitted until the budget-allocations endpoint serves a cost
   * figure for the overrun; the band renders time-only until then.
   */
  costLabel?: string | null;
  className?: string;
};

/**
 * Full-width warning strip for a task that has actually run over its
 * production budget. Colors match StatePill's danger palette (#fdecea /
 * #b9382a) so "over budget" reads the same everywhere it already appears
 * (ProductionTimeOutlook's danger text, the workers-app step budget line).
 */
export function TaskBudgetOverrunBand({
  overrun,
  costLabel,
  className,
}: TaskBudgetOverrunBandProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#b9382a]",
        className,
      )}
      data-testid="task-budget-overrun-band"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{overrun.label}</span>
      </span>

      {costLabel ? <span className="shrink-0">{costLabel}</span> : null}
    </div>
  );
}
