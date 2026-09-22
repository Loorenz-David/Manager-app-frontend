export {
  STOCK_NEED_BUCKETS,
  STOCK_NEED_BUCKET_LABEL,
} from "./stock-report.types";
export type {
  FulfilmentQuantities,
  FulfilmentSegments,
  StockNeedBucket,
  StockNeedCardData,
  StockReportAssignmentCardData,
  StockReportLoadStatus,
  StockReportItem,
  StockReportItemViewModel,
  StockReportPriority,
  StockReportAssignment,
} from "./stock-report.types";
export {
  STOCK_REPORT_PRIORITY,
  StockReportItemSchema,
  StockReportAssignmentSchema,
  formatStockPropertyValues,
  titleCase,
  toStockReportItemViewModel,
  toStockReportPropertyTags,
} from "./stock-report.types";

export {
  COLOURED_BUDGET_PERCENT,
  SEGMENT_MIN_PERCENT,
  computeFulfilmentSegments,
} from "./lib/fulfilment-bar";
export type { FulfilmentSegment } from "./lib/fulfilment-bar";

// --- board -----------------------------------------------------------------
export { FulfilmentBar } from "./components/board/FulfilmentBar";
export type {
  FulfilmentBarProps,
  FulfilmentBarSize,
} from "./components/board/FulfilmentBar";
export { FulfilmentLegend } from "./components/board/FulfilmentLegend";
export { StockNeedPropertyTags } from "./components/board/StockNeedPropertyTags";
export type { StockNeedPropertyTagsProps } from "./components/board/StockNeedPropertyTags";
export { StockNeedQuantityPanel } from "./components/board/StockNeedQuantityPanel";
export type { StockNeedQuantityPanelProps } from "./components/board/StockNeedQuantityPanel";
export { StockNeedCard } from "./components/board/StockNeedCard";
export type { StockNeedCardProps } from "./components/board/StockNeedCard";
export { StockNeedCardSkeleton } from "./components/board/StockNeedCardSkeleton";
export { StockNeedSortableList } from "./components/board/StockNeedSortableList";
export type { StockNeedSortableListProps } from "./components/board/StockNeedSortableList";
export { StockReportBucketPicker } from "./components/board/StockReportBucketPicker";
export type { StockReportBucketPickerProps } from "./components/board/StockReportBucketPicker";
export { StockReportSearchRow } from "./components/board/StockReportSearchRow";
export type { StockReportSearchRowProps } from "./components/board/StockReportSearchRow";
export {
  StockReportBoardEmptyState,
  StockReportBoardErrorState,
  StockReportBoardSkeleton,
} from "./components/board/StockReportBoardStates";
export type { StockReportBoardErrorStateProps } from "./components/board/StockReportBoardStates";
export { StockReportBoardFab } from "./components/board/StockReportBoardFab";
export type { StockReportBoardFabProps } from "./components/board/StockReportBoardFab";
export { StockReportBoardView } from "./components/board/StockReportBoardView";
export type { StockReportBoardViewProps } from "./components/board/StockReportBoardView";

// --- detail ----------------------------------------------------------------
export { StockNeedSummaryCard } from "./components/detail/StockNeedSummaryCard";
export type { StockNeedSummaryCardProps } from "./components/detail/StockNeedSummaryCard";
export { StockReportAddItemButton } from "./components/detail/StockReportAddItemButton";
export type { StockReportAddItemButtonProps } from "./components/detail/StockReportAddItemButton";
export { StockReportAssignmentList } from "./components/detail/StockReportAssignmentList";
export type { StockReportAssignmentListProps } from "./components/detail/StockReportAssignmentList";
export {
  StockReportAssignmentListSkeleton,
  StockReportAssignmentsEmptyState,
  StockReportDetailErrorState,
  StockReportMissingNotice,
} from "./components/detail/StockReportDetailStates";
export type { StockReportDetailErrorStateProps } from "./components/detail/StockReportDetailStates";
export { StockReportDetailView } from "./components/detail/StockReportDetailView";
export type { StockReportDetailViewProps } from "./components/detail/StockReportDetailView";

// --- sheet content ---------------------------------------------------------
export { StockReportPrioritySheetContent } from "./components/sheets/StockReportPrioritySheetContent";
export type { StockReportPrioritySheetContentProps } from "./components/sheets/StockReportPrioritySheetContent";
export { StockReportFilterSheetContent } from "./components/sheets/StockReportFilterSheetContent";
export type { StockReportFilterSheetContentProps } from "./components/sheets/StockReportFilterSheetContent";
export { StockReportActionsSheetContent } from "./components/sheets/StockReportActionsSheetContent";
export type { StockReportActionsSheetContentProps } from "./components/sheets/StockReportActionsSheetContent";
export { StockMatchWarningSheetContent } from "./components/sheets/StockMatchWarningSheetContent";
export type { StockMatchWarningSheetContentProps } from "./components/sheets/StockMatchWarningSheetContent";
export {
  STOCK_MATCH_NO_VALUE,
  toStockMatchFailureRows,
} from "./lib/stock-match-failure-rows";
export type { StockMatchFailureRow } from "./lib/stock-match-failure-rows";
export { StockMatchStatusRow } from "./components/sheets/StockMatchStatusRow";
export type {
  StockMatchStatusRowProps,
  StockMatchStatusRowState,
} from "./components/sheets/StockMatchStatusRow";

/** Page exports stay loader-only so the route entry remains code-split. */
export function loadStockReportRouteEntryPage() {
  return import("./route-entry").then((module) => ({ default: module.StockReportRouteEntryPage }));
}
export { stockReportKeys } from "./api/stock-report-keys";
export { useStockReportListQuery, useStockReportAssignmentsQuery, prefetchStockReportAssignmentsData } from "./api/use-stock-report-queries";
export { stockReportSocketEvents } from "./socket-events";
export { useStockMatchPreview } from "./actions/use-stock-match-preview";
export { useStockAssignmentGate } from "./hooks/use-stock-assignment-gate";
export type { StockAssignmentGateOpener } from "./hooks/use-stock-assignment-gate";
export { STOCK_REPORT_PERMISSIONS } from "./permissions";
export { useStockReportPermissions } from "./lib/use-stock-report-permissions";
export { StockReportOpenersProvider } from "./openers";
export type { StockReportSurfaceOpeners } from "./openers";
export {
  stockReportSurfaces,
  STOCK_REPORT_DETAIL_SURFACE_ID,
  STOCK_REPORT_PRIORITY_SURFACE_ID,
  STOCK_REPORT_FILTER_SURFACE_ID,
  STOCK_REPORT_ACTIONS_SURFACE_ID,
  STOCK_MATCH_WARNING_SURFACE_ID,
  preloadStockReportDetailSurface,
  preloadStockMatchWarningSurface,
} from "./surface-ids";
export type { StockReportDetailSurfaceProps, StockReportPrioritySurfaceProps, StockReportFilterSurfaceProps, StockReportActionsSurfaceProps, StockMatchWarningSurfaceProps } from "./surface-ids";

// --- fixtures --------------------------------------------------------------
export * from "./fixtures/stock-report-fixtures";
