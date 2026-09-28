import { useEffect } from "react";
import { useSurface, useSurfaceHeader } from "@beyo/hooks";

import { useStockReportActiveVersionQuery } from "../api/use-stock-report-queries";
import { StockReportBoardView } from "../components/board/StockReportBoardView";
import { StockReportMenuButton } from "../components/StockReportMenuButton";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { useStockReportBoardController } from "../controllers/use-stock-report-board-controller";
import { STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID } from "../surface-ids";
import { toStockReportVersionViewModel, type StockReportSnapshotVersion } from "../stock-report.types";

const TITLE = "Stock requested";

/**
 * The board lists one version's snapshots, so its title is that version's
 * (OC-18): its own title when it has one, else the day it was created — "Thu,
 * 7th July". Before the version has loaded, or when there is none yet, the
 * board's plain name stands alone.
 */
export function stockReportBoardTitle(version: StockReportSnapshotVersion | null | undefined, now?: number): string {
  return version ? toStockReportVersionViewModel(version, now).displayTitle : TITLE;
}

/**
 * The priority board as a slide page (owner, 2026-09-26): the managers' hub
 * opens it from the version card. Same view and controller as the tab page
 * workers and sellers render; only the back row differs, and that row scrolls
 * with the board — the surface's fixed header is muted.
 */
export function StockReportBoardSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { open } = useSurface();
  const controller = useStockReportBoardController();
  // Served from the cache the hub already filled; the same default progress
  // filter keeps the two reads on one key.
  const activeVersion = useStockReportActiveVersionQuery();
  const title = stockReportBoardTitle(activeVersion.data);
  // The ⋮ names the active version (OC-3), so it waits for the read.
  const activeVersionId = activeVersion.data?.client_id;

  // The surface's fixed header cannot scroll with the body, so it is muted
  // outright and the page draws its own (owner, 2026-09-26). The title still
  // feeds the surface's accessible name.
  useEffect(() => {
    header?.setTitle(title);
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header, title]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="stock-report-board-page">
      <StockReportBoardView
        header={
          <StockReportSlideHeader
            actions={
              controller.permissions.canManageVersions && activeVersionId ? (
                <StockReportMenuButton
                  data-testid="stock-report-board-menu"
                  label="Version actions"
                  onPress={() => open(STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID, { versionId: activeVersionId })}
                />
              ) : null
            }
            data-testid="stock-report-board-back"
            title={title}
            onBack={() => header?.requestClose()}
          />
        }
        activeFilterCount={controller.activeFilterCount}
        bucket={controller.bucket}
        buckets={controller.buckets}
        canReorganise={controller.permissions.canPrioritise}
        cards={controller.cards}
        errorMessage={controller.errorMessage}
        hasMore={controller.hasMore}
        isLoadingMore={controller.isLoadingMore}
        isReorganiseMode={controller.isReorganiseMode}
        reorderDisabled={controller.reorderDisabled}
        searchValue={controller.searchValue}
        status={controller.status}
        onBucketChange={controller.setBucket}
        onCardPress={controller.openDetail}
        onFilterPress={controller.openFilter}
        onRefresh={controller.refetch}
        onReorder={controller.reorder}
        onRetry={() => void controller.refetch()}
        onSearchChange={controller.setSearchValue}
        onSetPriority={controller.openPriority}
        onShowMore={controller.loadMore}
        onToggleReorganise={controller.toggleReorganise}
      />
    </div>
  );
}
