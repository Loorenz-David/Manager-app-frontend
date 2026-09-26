import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import type { MajorCategory } from "@beyo/lib";
import type { ComponentType } from "react";
import type { StockMatchWarningSheetContentProps } from "./components/sheets/StockMatchWarningSheetContent";
import type { StockReportLegendSheetContentProps } from "./components/sheets/StockReportLegendSheetContent";

export const STOCK_REPORT_DETAIL_SURFACE_ID = "stock-report-detail-slide";
export const STOCK_REPORT_PRIORITY_SURFACE_ID = "stock-report-priority-sheet";
export const STOCK_REPORT_FILTER_SURFACE_ID = "stock-report-filter-sheet";
export const STOCK_REPORT_ACTIONS_SURFACE_ID = "stock-report-actions-sheet";
export const STOCK_MATCH_WARNING_SURFACE_ID = "stock-match-warning-sheet";
/** The priority board as a slide page — the managers' hub opens it (owner, 2026-09-26). */
export const STOCK_REPORT_BOARD_SURFACE_ID = "stock-report-board-slide";
/** The board in missing-stock mode (owner, 2026-09-26). */
export const STOCK_REPORT_MISSING_SURFACE_ID = "stock-report-missing-slide";
/** The version history (§5.9). */
export const STOCK_REPORT_VERSION_HISTORY_SURFACE_ID = "stock-report-version-history-slide";
/** The detail page's own ⋮ menu: mark / unmark missing. */
export const STOCK_REPORT_DETAIL_MENU_SURFACE_ID = "stock-report-detail-menu-sheet";
/** The fulfilment bar's legend, opened from the detail summary card (owner, 2026-09-26). */
export const STOCK_REPORT_LEGEND_SURFACE_ID = "stock-report-legend-sheet";

export type StockReportDetailSurfaceProps = { stockNeedId: string };
export type StockReportPrioritySurfaceProps = { current: "unset" | "high" | "medium" | "low"; onSelect: (priority: "high" | "medium" | "low" | null) => void };
/** `initial` is what Clear returns to — the role default, not "no filter". */
export type StockReportFilterSurfaceProps = { current: MajorCategory | null; initial: MajorCategory | null; onApply: (majorCategory: MajorCategory | null) => void };
export type StockReportActionsSurfaceProps = { onRemove: () => void; disabled?: boolean };
export type StockMatchWarningSurfaceProps = StockMatchWarningSheetContentProps;
export type StockReportBoardSurfaceProps = Record<string, never>;
export type StockReportMissingSurfaceProps = Record<string, never>;
export type StockReportVersionHistorySurfaceProps = Record<string, never>;
/**
 * Computed by the detail page from `missingQuantityBounds` at tap time: the
 * sheet renders "Mark N missing" only while `markable > 0` and "Unmark N
 * missing" only while `missing > 0`.
 */
export type StockReportDetailMenuSurfaceProps = {
  markable: number;
  missing: number;
  onMarkMissing: () => void;
  onUnmarkMissing: () => void;
  disabled?: boolean;
};
/** The summary card's five numbers, so the sheet draws the same bar it explains. */
export type StockReportLegendSurfaceProps = StockReportLegendSheetContentProps;

function lazyPage<T extends ComponentType<Record<string, never>>>(loader: () => Promise<{ default: T }>) { return lazyWithPreload(loader); }
const detail = lazyPage(() => import("./surfaces/StockReportDetailSlidePage").then((m) => ({ default: m.StockReportDetailSlidePage })));
const priority = lazyPage(() => import("./surfaces/StockReportPrioritySheetPage").then((m) => ({ default: m.StockReportPrioritySheetPage })));
const filter = lazyPage(() => import("./surfaces/StockReportFilterSheetPage").then((m) => ({ default: m.StockReportFilterSheetPage })));
const actions = lazyPage(() => import("./surfaces/StockReportActionsSheetPage").then((m) => ({ default: m.StockReportActionsSheetPage })));
const match = lazyPage(() => import("./surfaces/StockMatchWarningSheetPage").then((m) => ({ default: m.StockMatchWarningSheetPage })));
const board = lazyPage(() => import("./surfaces/StockReportBoardSlidePage").then((m) => ({ default: m.StockReportBoardSlidePage })));
const missing = lazyPage(() => import("./surfaces/StockReportMissingSlidePage").then((m) => ({ default: m.StockReportMissingSlidePage })));
const history = lazyPage(() => import("./surfaces/StockReportVersionHistorySlidePage").then((m) => ({ default: m.StockReportVersionHistorySlidePage })));
const detailMenu = lazyPage(() => import("./surfaces/StockReportDetailMenuSheetPage").then((m) => ({ default: m.StockReportDetailMenuSheetPage })));
const legend = lazyPage(() => import("./surfaces/StockReportLegendSheetPage").then((m) => ({ default: m.StockReportLegendSheetPage })));

export const preloadStockReportDetailSurface = detail.preload;
export const preloadStockMatchWarningSurface = match.preload;
export const preloadStockReportBoardSurface = board.preload;
export const preloadStockReportMissingSurface = missing.preload;
export const preloadStockReportVersionHistorySurface = history.preload;
export const preloadStockReportDetailMenuSurface = detailMenu.preload;
export const preloadStockReportLegendSurface = legend.preload;
export const stockReportSurfaces: SurfaceRegistrations = {
  [STOCK_REPORT_DETAIL_SURFACE_ID]: { surface: "slide", component: detail.Component },
  [STOCK_REPORT_PRIORITY_SURFACE_ID]: { surface: "sheet", component: priority.Component },
  [STOCK_REPORT_FILTER_SURFACE_ID]: { surface: "sheet", component: filter.Component },
  [STOCK_REPORT_ACTIONS_SURFACE_ID]: { surface: "sheet", component: actions.Component },
  [STOCK_MATCH_WARNING_SURFACE_ID]: { surface: "sheet", component: match.Component },
  [STOCK_REPORT_BOARD_SURFACE_ID]: { surface: "slide", component: board.Component },
  [STOCK_REPORT_MISSING_SURFACE_ID]: { surface: "slide", component: missing.Component },
  [STOCK_REPORT_VERSION_HISTORY_SURFACE_ID]: { surface: "slide", component: history.Component },
  [STOCK_REPORT_DETAIL_MENU_SURFACE_ID]: { surface: "sheet", component: detailMenu.Component },
  [STOCK_REPORT_LEGEND_SURFACE_ID]: { surface: "sheet", component: legend.Component },
};
