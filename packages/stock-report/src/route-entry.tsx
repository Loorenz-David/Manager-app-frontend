import { StockReportBoardView } from "./components/board/StockReportBoardView";
import { useStockReportBoardController } from "./controllers/use-stock-report-board-controller";

export function StockReportRouteEntryPage(): React.JSX.Element {
  const controller = useStockReportBoardController();
  return <StockReportBoardView buckets={controller.buckets} bucket={controller.bucket} cards={controller.cards} canReorganise={controller.permissions.canPrioritise} errorMessage={controller.errorMessage} hasMore={controller.hasMore} isLoadingMore={controller.isLoadingMore} isReorganiseMode={controller.isReorganiseMode} activeFilterCount={controller.activeFilterCount} onBucketChange={controller.setBucket} onCardPress={controller.openDetail} onFilterPress={controller.openFilter} onRefresh={controller.refetch} onReorder={controller.reorder} onRetry={() => void controller.refetch()} onSearchChange={controller.setSearchValue} onSetPriority={controller.openPriority} onShowMore={controller.loadMore} onToggleReorganise={controller.toggleReorganise} reorderDisabled={controller.reorderDisabled} searchValue={controller.searchValue} status={controller.status} />;
}
