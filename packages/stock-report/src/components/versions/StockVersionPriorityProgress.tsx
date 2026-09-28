import { STOCK_NEED_BUCKET_LABEL, STOCK_REPORT_PRIORITY, type StockReportVersionViewModel } from "../../stock-report.types";
import { StockVersionProgressBar } from "./StockVersionProgressBar";

export type StockVersionPriorityProgressProps = {
  version: StockReportVersionViewModel;
  /**
   * Prefix for every testid in the block. The hub's one card keeps the
   * original ids; a list of cards passes one per version so ids stay unique.
   */
  testIdPrefix?: string;
};

/**
 * A version's progress **by priority** (owner, 2026-09-26): three rows, one
 * bar per group over `quantity_completed / quantity_target` (§6.8), and a line
 * when nothing is prioritised yet. Shared by the hub's card and the draft
 * cards (plan §G.1).
 */
export function StockVersionPriorityProgress({
  version,
  testIdPrefix = "stock-version-progress",
}: StockVersionPriorityProgressProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2" data-testid={`${testIdPrefix}-by-priority`}>
      {STOCK_REPORT_PRIORITY.map((priority) => {
        const group = version.byPriority[priority];
        return (
          <div key={priority} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">
              {STOCK_NEED_BUCKET_LABEL[priority]}
            </span>
            <StockVersionProgressBar
              className="flex-1"
              data-testid={`${testIdPrefix}-${priority}`}
              progress={group}
            />
            <span
              className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground"
              data-testid={`${testIdPrefix}-${priority}-count`}
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
  );
}
