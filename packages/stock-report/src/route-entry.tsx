import { StockReportBoardView } from "./components/board/StockReportBoardView";
import { useStockReportBoardController } from "./controllers/use-stock-report-board-controller";

export function StockReportRouteEntryPage(): React.JSX.Element {
  const controller = useStockReportBoardController();
  return <StockReportBoardView buckets={controller.permissions.buckets} bucket={controller.bucket} cards={controller.cards} canReorganise={controller.permissions.canPrioritise} errorMessage={controller.errorMessage} isReorganiseMode={controller.isReorganiseMode} activeFilterCount={controller.activeFilterCount} onBucketChange={controller.setBucket} onCardPress={controller.openDetail} onFilterPress={controller.openFilter} onRefresh={() => controller.refetch().then(() => undefined)} onReorder={controller.reorder} onRetry={() => void controller.refetch()} onSearchChange={controller.setSearchValue} onSetPriority={controller.openPriority} onToggleReorganise={controller.toggleReorganise} reorderDisabled={controller.reorderDisabled} searchValue={controller.searchValue} status={controller.status} />;
}
