import { useStockReportHubController } from "../controllers/use-stock-report-hub-controller";
import { StockReportHubView } from "./StockReportHubView";
import { StockVersionCreateOverlay } from "./StockVersionCreateOverlay";

/**
 * The manager's stock report tab (owner, 2026-09-26): the hub view over its
 * controller. The board, the missing list and the history open as slide page
 * surfaces on top of it. Opening a version blocks the tab with an overlay and,
 * once the backend has answered, opens the board — whose query was dropped by
 * the action, so it fetches the new version's snapshots.
 */
export function StockReportHub(): React.JSX.Element {
  const hub = useStockReportHubController();

  return (
    <div className="relative h-full overflow-y-auto" data-testid="stock-report-manager-hub">
      <StockReportHubView
        canManageVersions={hub.permissions.canManageVersions}
        missingSummary={hub.missingSummary}
        version={hub.version}
        versionStatus={hub.versionStatus}
        onCreateVersion={() => hub.createVersion(hub.openBoard)}
        onOpenBoard={hub.openBoard}
        onOpenHistory={hub.openHistory}
        onOpenMissing={hub.openMissing}
      />

      {hub.createPhase !== "idle" ? (
        <StockVersionCreateOverlay
          errorMessage={hub.createErrorMessage}
          phase={hub.createPhase}
          onDismiss={hub.dismissCreateFailure}
        />
      ) : null}
    </div>
  );
}
