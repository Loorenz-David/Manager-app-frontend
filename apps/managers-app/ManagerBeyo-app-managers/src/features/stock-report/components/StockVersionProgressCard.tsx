import {
  STOCK_REPORT_PRIORITY,
  STOCK_NEED_BUCKET_LABEL,
  StockVersionProgressBar,
  formatVersionRequested,
  type StockReportLoadStatus,
  type StockReportVersionViewModel,
} from "@beyo/stock-report";
import { ChevronRight, Layers } from "lucide-react";

type StockVersionProgressCardProps = {
  version: StockReportVersionViewModel | null;
  status: StockReportLoadStatus;
  /** Opens the board — the card is the way in, replacing the old row button. */
  onPress: () => void;
};

const CARD_CLASS =
  "flex w-full flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm";

/**
 * The active version's progress **by priority** (owner, 2026-09-26) — three
 * bars, one per group, over `quantity_completed / quantity_target` (§6.8) —
 * with the version's age counted forward ("2 days running"). Tapping it opens
 * the board. Before the first version it still opens the (empty) board, and
 * says why it is empty.
 */
export function StockVersionProgressCard({
  version,
  status,
  onPress,
}: StockVersionProgressCardProps): React.JSX.Element {
  if (status === "loading") {
    return (
      <div
        className={`${CARD_CLASS} h-40 animate-pulse`}
        data-testid="stock-version-card-skeleton"
      />
    );
  }

  return (
    <button
      className={CARD_CLASS}
      data-testid="stock-report-hub-open-board"
      type="button"
      onClick={onPress}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Layers aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {version ? "Current version" : "Stock needs"}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="stock-version-age">
              {status === "error"
                ? "Version could not be loaded"
                : version
                  ? `${version.ageLabel} · ${formatVersionRequested(version.progress.quantity_requested)}`
                  : "No version yet — open the first one to start"}
            </p>
          </div>
        </div>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </div>

      {version ? (
        <div className="flex flex-col gap-2" data-testid="stock-version-progress-by-priority">
          {STOCK_REPORT_PRIORITY.map((priority) => {
            const group = version.byPriority[priority];
            return (
              <div key={priority} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">
                  {STOCK_NEED_BUCKET_LABEL[priority]}
                </span>
                <StockVersionProgressBar
                  className="flex-1"
                  data-testid={`stock-version-progress-${priority}`}
                  progress={group}
                />
                <span
                  className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground"
                  data-testid={`stock-version-progress-${priority}-count`}
                >
                  {group.percent === null ? "—" : `${group.completed}/${group.target}`}
                </span>
              </div>
            );
          })}
          {version.totalProgress.percent === null ? (
            <p className="text-xs text-muted-foreground">Nothing prioritised yet</p>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
