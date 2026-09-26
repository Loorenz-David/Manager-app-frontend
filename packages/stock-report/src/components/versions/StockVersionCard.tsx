import { formatShortDate } from "@beyo/lib";
import { StatePill } from "@beyo/ui";

import type { StockReportVersionViewModel } from "../../stock-report.types";
import { StockVersionProgressBar } from "./StockVersionProgressBar";

export type StockVersionCardProps = {
  version: StockReportVersionViewModel;
};

/**
 * One history entry: when the version ran, how long, how many rows it froze,
 * and its **total** progress — the history deliberately does not split by
 * priority (owner, 2026-09-26); the hub card does that for the active one.
 */
export function StockVersionCard({ version }: StockVersionCardProps): React.JSX.Element {
  const { totalProgress } = version;
  const dateRange = formatShortDate(version.active_at, version.closed_at) ?? "";
  const snapshotCount = `${version.snapshot_count} stock ${version.snapshot_count === 1 ? "need" : "needs"}`;

  return (
    <article
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm"
      data-active={version.isActive ? "true" : "false"}
      data-testid={`stock-version-card-${version.client_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{dateRange}</p>
          <p className="text-sm text-muted-foreground">
            {version.ageLabel} · {snapshotCount}
          </p>
        </div>
        {version.isActive ? <StatePill label="Active" variant="active" /> : null}
      </div>

      <StockVersionProgressBar
        data-testid={`stock-version-card-bar-${version.client_id}`}
        progress={totalProgress}
      />

      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        {totalProgress.percent === null ? (
          <span>Nothing prioritised yet</span>
        ) : (
          <span>
            {totalProgress.completed} / {totalProgress.target} units
          </span>
        )}
        <span>
          {totalProgress.itemsCompleted} / {totalProgress.itemsTotal} needs done
        </span>
      </div>
    </article>
  );
}
