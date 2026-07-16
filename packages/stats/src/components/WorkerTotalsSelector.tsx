import { memo } from "react";

import type { WorkerGranularityIntention } from "../types";

export type WorkerTotalsSelectorProps = {
  active: WorkerGranularityIntention;
  workingDisplay: string;
  pausedDisplay: string;
  completedCount: number;
  onSelect: (intention: WorkerGranularityIntention) => void;
};

const TABS: {
  intention: WorkerGranularityIntention;
  label: string;
}[] = [
  { intention: "working", label: "Working" },
  { intention: "paused", label: "Paused" },
  { intention: "completed", label: "Completed" },
];

export const WorkerTotalsSelector = memo(function WorkerTotalsSelector({
  active,
  workingDisplay,
  pausedDisplay,
  completedCount,
  onSelect,
}: WorkerTotalsSelectorProps): React.JSX.Element {
  const valueByIntention: Record<WorkerGranularityIntention, string> = {
    working: workingDisplay,
    paused: pausedDisplay,
    completed: String(completedCount),
  };

  return (
    <div
      className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      data-testid="worker-granularity-totals"
      role="tablist"
    >
      {TABS.map(({ intention, label }) => {
        const isActive = intention === active;

        return (
          <button
            key={intention}
            aria-selected={isActive}
            className={`relative flex min-w-0 flex-col items-center px-2 py-3 text-center transition-colors ${
              isActive ? "bg-[#eaf4ff]" : "bg-transparent"
            }`}
            data-testid={`worker-granularity-tab-${intention}`}
            role="tab"
            type="button"
            onClick={() => onSelect(intention)}
          >
            <span
              className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                isActive ? "text-[#1f5ea8]" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            <strong
              className={`mt-1 text-sm font-semibold tracking-tight ${
                isActive ? "text-[#1f5ea8]" : "text-foreground"
              }`}
            >
              {valueByIntention[intention]}
            </strong>
          </button>
        );
      })}
    </div>
  );
});
