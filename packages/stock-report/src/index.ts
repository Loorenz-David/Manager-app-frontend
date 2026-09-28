export {
  STOCK_NEED_BUCKETS,
  STOCK_NEED_BUCKET_LABEL,
  STOCK_REPORT_ACTIVE_SCOPE,
  STOCK_REPORT_VERSION_STATES,
  stockReportVersionScope,
} from "./stock-report.types";
export type {
  FulfilmentQuantities,
  FulfilmentSegments,
  StockNeedBucket,
  StockNeedCardData,
  StockReportAssignmentCardData,
  StockReportBoardBucket,
  StockReportBoardMode,
  StockReportListFilter,
  StockReportLoadStatus,
  StockReportItem,
  StockReportItemSnapshot,
  StockReportItemViewModel,
  StockReportMissingSummary,
  StockReportMissingSource,
  StockReportPriority,
  StockReportRequestedSource,
  StockReportAssignment,
  StockReportSnapshotVersion,
  StockReportSnapshotVersionRow,
  StockReportVersionScope,
  StockReportVersionState,
  StockReportVersionGroupProgress,
  StockReportVersionProgress,
  StockReportVersionProgressCounters,
  StockReportVersionViewModel,
} from "./stock-report.types";
export {
  EMPTY_STOCK_REPORT_FILTER,
  STOCK_REPORT_PRIORITY,
  StockReportItemSchema,
  StockReportItemSnapshotSchema,
  StockReportAssignmentSchema,
  StockReportMissingSummarySchema,
  StockReportSnapshotVersionRowSchema,
  StockReportSnapshotVersionSchema,
  StockReportVersionProgressSchema,
  formatStockPropertyValues,
  titleCase,
  toStockReportItemViewModel,
  toStockReportPropertyTags,
  toStockReportVersionViewModel,
} from "./stock-report.types";
export { missingQuantityBounds } from "./lib/missing-quantity";
export type { MissingQuantityBounds } from "./lib/missing-quantity";
export { formatVersionAge, formatVersionRequested, versionDaysRunning } from "./lib/version-age";
export {
  formatScheduleLabel,
  formatVersionDayTitle,
  ordinalDay,
  sameInstant,
  versionScheduleState,
} from "./lib/version-format";
export type { StockReportScheduleState } from "./lib/version-format";

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
export { StockNeedSummaryCard, missingSourceLine } from "./components/detail/StockNeedSummaryCard";
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

export { StockReportSlideHeader } from "./components/StockReportSlideHeader";
export type { StockReportSlideHeaderProps } from "./components/StockReportSlideHeader";
export { StockReportMenuButton } from "./components/StockReportMenuButton";
export type { StockReportMenuButtonProps } from "./components/StockReportMenuButton";

// --- versions --------------------------------------------------------------
export { StockVersionProgressBar } from "./components/versions/StockVersionProgressBar";
export type { StockVersionProgressBarProps } from "./components/versions/StockVersionProgressBar";
export { StockVersionCard } from "./components/versions/StockVersionCard";
export type { StockVersionCardProps } from "./components/versions/StockVersionCard";
export {
  StockVersionListEmptyState,
  StockVersionListErrorState,
  StockVersionListSkeleton,
} from "./components/versions/StockVersionListStates";

// --- sheet content ---------------------------------------------------------
export { StockReportPrioritySheetContent } from "./components/sheets/StockReportPrioritySheetContent";
export type { StockReportPrioritySheetContentProps } from "./components/sheets/StockReportPrioritySheetContent";
export { StockReportFilterSheetContent } from "./components/sheets/StockReportFilterSheetContent";
export type { StockReportFilterSheetContentProps } from "./components/sheets/StockReportFilterSheetContent";
export { StockReportActionsSheetContent } from "./components/sheets/StockReportActionsSheetContent";
export type { StockReportActionsSheetContentProps } from "./components/sheets/StockReportActionsSheetContent";
export { ROW_CLASS as STOCK_REPORT_SHEET_ROW_CLASS, StockReportDetailMenuSheetContent } from "./components/sheets/StockReportDetailMenuSheetContent";
export type { StockReportDetailMenuSheetContentProps } from "./components/sheets/StockReportDetailMenuSheetContent";
export { StockReportLegendSheetContent } from "./components/sheets/StockReportLegendSheetContent";
export type { StockReportLegendSheetContentProps } from "./components/sheets/StockReportLegendSheetContent";
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
export { stockReportKeys, stockReportMutationKeys } from "./api/stock-report-keys";
export {
  cachedStockReportDraftScopes,
  dropStockReportVersionQueries,
  restartStockReportListQueries,
} from "./api/stock-report-list-cache";
export {
  STOCK_REPORT_PROGRESS_PRIORITIES,
  progressPriorityParam,
} from "./api/stock-report-api";
export type {
  CreateStockReportVersionInput,
  RefreshStockReportVersionResult,
  StockReportProgressPriorityFilter,
  UpdateStockReportVersionInput,
} from "./api/stock-report-api";
export {
  useStockReportListQuery,
  useStockReportAssignmentsQuery,
  useStockReportActiveVersionQuery,
  useStockReportDraftCountQuery,
  useStockReportMissingSummaryQuery,
  useStockReportVersionQuery,
  useStockReportVersionsQuery,
  prefetchStockReportAssignmentsData,
} from "./api/use-stock-report-queries";
export {
  useActivateStockReportVersion,
  useCreateStockReportVersion,
  useDeleteStockReportVersion,
  useRefreshStockReportVersionRequested,
  useSetStockReportMissingQuantity,
  useSetStockReportPriority,
  useSetStockReportRequestedQuantity,
  useUpdateStockReportVersion,
} from "./actions/use-stock-report-actions";
export type { StockReportRowEditScope } from "./actions/use-stock-report-actions";
export { stockReportFailureIdentity, stockReportRequestFailureMessage } from "./lib/stock-report-request-failure";
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
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  STOCK_REPORT_DETAIL_MENU_SURFACE_ID,
  STOCK_REPORT_LEGEND_SURFACE_ID,
  STOCK_REPORT_DRAFT_BOARD_SURFACE_ID,
  STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID,
  STOCK_REPORT_REQUESTED_SURFACE_ID,
  preloadStockReportDraftBoardSurface,
  preloadStockReportDetailSurface,
  preloadStockMatchWarningSurface,
  preloadStockReportBoardSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionHistorySurface,
  preloadStockReportDetailMenuSurface,
  preloadStockReportLegendSurface,
} from "./surface-ids";
export type {
  StockReportDetailSurfaceProps,
  StockReportPrioritySurfaceProps,
  StockReportFilterSurfaceProps,
  StockReportActionsSurfaceProps,
  StockMatchWarningSurfaceProps,
  StockReportBoardSurfaceProps,
  StockReportMissingSurfaceProps,
  StockReportVersionHistorySurfaceProps,
  StockReportDetailMenuSurfaceProps,
  StockReportLegendSurfaceProps,
  StockReportDraftBoardSurfaceProps,
  StockReportVersionActionsSurfaceProps,
  StockReportRequestedSurfaceProps,
} from "./surface-ids";

// --- fixtures --------------------------------------------------------------
export * from "./fixtures/stock-report-fixtures";
