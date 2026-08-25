import { Clock } from "lucide-react";
import { cn } from "@beyo/lib";

import type { TaskBudgetSignalDisplayViewModel } from "../../lib/task-budget-overrun";

export type TaskBudgetOverrunBandProps = {
  signal: TaskBudgetSignalDisplayViewModel;
  className?: string;
};

/**
 * Full-width warning strip for an actual or projected production-budget
 * overrun. Actual overruns use the established danger palette; projections
 * use the production-time forecast amber (#8a6d1c).
 */
export function TaskBudgetOverrunBand({
  signal,
  className,
}: TaskBudgetOverrunBandProps): React.JSX.Element {
  const isProjected = signal.tone === "projected_over";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold",
        isProjected ? "bg-[#fff4d6] text-[#8a6d1c]" : "bg-[#fdecea] text-[#b9382a]",
        className,
      )}
      data-testid="task-budget-overrun-band"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{signal.label}</span>
      </span>

      {signal.costLabel ? <span className="shrink-0">{signal.costLabel}</span> : null}
    </div>
  );
}
