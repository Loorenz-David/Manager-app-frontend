import { useStockReportHubController } from "../controllers/use-stock-report-hub-controller";
import { StockReportHubView } from "./StockReportHubView";

/**
 * The manager's stock report tab (owner, 2026-09-26): the hub view over its
 * controller. The board, the missing list, the drafts, the history and the
 * new-version form all open as surfaces on top of it.
 */
export function StockReportHub(): React.JSX.Element {
  const hub = useStockReportHubController();

  return (
    <div className="relative h-full overflow-y-auto" data-testid="stock-report-manager-hub">
      <StockReportHubView
        canManageVersions={hub.permissions.canManageVersions}
        draftCount={hub.draftCount}
        missingSummary={hub.missingSummary}
        version={hub.version}
        versionStatus={hub.versionStatus}
        onCreateVersion={hub.openCreateForm}
        onOpenBoard={hub.openBoard}
        onOpenDrafts={hub.openDrafts}
        onOpenHistory={hub.openHistory}
        onOpenMissing={hub.openMissing}
      />
    </div>
  );
}
