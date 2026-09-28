import { StatePill } from "@beyo/ui";

import { formatVersionRequested } from "../../lib/version-age";
import type { StockReportVersionViewModel } from "../../stock-report.types";
import { StockReportMenuButton } from "../StockReportMenuButton";
import { StockVersionPriorityProgress } from "./StockVersionPriorityProgress";

export type StockDraftVersionCardProps = {
  version: StockReportVersionViewModel;
  /** The ⋮ is for the roles that manage versions (admin, manager). */
  canManage: boolean;
  onPress: () => void;
  onMenu: () => void;
};

/**
 * One draft on the drafts page (plan §G.2): its title, what it asks for (live
 * on a draft, v8 §5.9), its schedule — marked overdue once the time has passed
 * without it firing (v7 §5.21) — and its progress by priority. The card opens
 * the draft's board; the ⋮ beside the title opens its actions and never the
 * board.
 */
export function StockDraftVersionCard({
  version,
  canManage,
  onPress,
  onMenu,
}: StockDraftVersionCardProps): React.JSX.Element {
  const id = version.client_id;
  return (
    <article className="relative rounded-2xl border border-border bg-card shadow-sm" data-testid={`stock-draft-card-root-${id}`}>
      <button
        className="flex w-full flex-col gap-3 px-4 py-3.5 text-left"
        data-testid={`stock-draft-card-${id}`}
        type="button"
        onClick={onPress}
      >
        {/* Room on the right for the ⋮, which sits above the button, not in it. */}
        <div className={canManage ? "min-w-0 pr-10" : "min-w-0"}>
          <p className="truncate text-sm font-semibold text-foreground" data-testid={`stock-draft-card-title-${id}`}>
            {version.displayTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatVersionRequested(version.progress.quantity_requested)}
          </p>
          {version.scheduleLabel ? (
            <p
              className="mt-1 flex items-center gap-2 text-xs font-medium text-muted-foreground"
              data-testid={`stock-draft-card-schedule-${id}`}
            >
              {version.isOverdue ? <StatePill label="Overdue" variant="danger" /> : null}
              <span className="truncate">{version.scheduleLabel}</span>
            </p>
          ) : null}
        </div>
        <StockVersionPriorityProgress testIdPrefix={`stock-draft-card-progress-${id}`} version={version} />
      </button>

      {canManage ? (
        <div className="absolute right-2 top-2">
          <StockReportMenuButton data-testid={`stock-draft-card-menu-${id}`} label="Version actions" onPress={onMenu} />
        </div>
      ) : null}
    </article>
  );
}
