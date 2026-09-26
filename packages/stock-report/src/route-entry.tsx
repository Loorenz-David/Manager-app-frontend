import { StockReportBoardView } from "./components/board/StockReportBoardView";
import { useStockReportBoardController } from "./controllers/use-stock-report-board-controller";

export type StockReportRouteEntryPageProps = {
  /** Passed to the board's controls block — the workers tab adds its top inset here. */
  controlsClassName?: string;
};

export function StockReportRouteEntryPage({ controlsClassName }: StockReportRouteEntryPageProps = {}): React.JSX.Element {
  const controller = useStockReportBoardController();
  return <StockReportBoardView controlsClassName={controlsClassName} buckets={controller.buckets} bucket={controller.bucket} cards={controller.cards} canReorganise={controller.permissions.canPrioritise} errorMessage={controller.errorMessage} hasMore={controller.hasMore} isLoadingMore={controller.isLoadingMore} isReorganiseMode={controller.isReorganiseMode} activeFilterCount={controller.activeFilterCount} onBucketChange={controller.setBucket} onCardPress={controller.openDetail} onFilterPress={controller.openFilter} onRefresh={controller.refetch} onReorder={controller.reorder} onRetry={() => void controller.refetch()} onSearchChange={controller.setSearchValue} onSetPriority={controller.openPriority} onShowMore={controller.loadMore} onToggleReorganise={controller.toggleReorganise} reorderDisabled={controller.reorderDisabled} searchValue={controller.searchValue} status={controller.status} />;
}
