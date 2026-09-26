import { useEffect } from "react";
import { formatShortDate } from "@beyo/lib";
import { useSurfaceHeader } from "@beyo/hooks";

import { useStockReportActiveVersionQuery } from "../api/use-stock-report-queries";
import { StockReportBoardView } from "../components/board/StockReportBoardView";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { useStockReportBoardController } from "../controllers/use-stock-report-board-controller";

const TITLE = "Stock requested";

/**
 * "Stock requested 09-24" — the board lists one version's snapshots, so its
 * title names the day that version opened (owner, 2026-09-26). Before the
 * version has loaded, or when there is none yet, the title stands alone.
 */
export function stockReportBoardTitle(activeAt: string | null | undefined): string {
  const date = formatShortDate(activeAt);
  return date ? `${TITLE} ${date}` : TITLE;
}

/**
 * The priority board as a slide page (owner, 2026-09-26): the managers' hub
 * opens it from the version card. Same view and controller as the tab page
 * workers and sellers render; only the back row differs, and that row scrolls
 * with the board — the surface's fixed header is muted.
 */
export function StockReportBoardSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useStockReportBoardController();
  // Served from the cache the hub already filled; the same default progress
  // filter keeps the two reads on one key.
  const activeVersion = useStockReportActiveVersionQuery();
  const title = stockReportBoardTitle(activeVersion.data?.active_at);

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
