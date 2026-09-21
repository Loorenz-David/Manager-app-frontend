import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import type { ComponentType } from "react";

export const STOCK_REPORT_DETAIL_SURFACE_ID = "stock-report-detail-slide";
export const STOCK_REPORT_PRIORITY_SURFACE_ID = "stock-report-priority-sheet";
export const STOCK_REPORT_ACTIONS_SURFACE_ID = "stock-report-actions-sheet";
export const STOCK_MATCH_WARNING_SURFACE_ID = "stock-match-warning-sheet";

export type StockReportDetailSurfaceProps = { stockNeedId: string };
export type StockReportPrioritySurfaceProps = { current: "unset" | "high" | "medium" | "low"; onSelect: (priority: "high" | "medium" | "low" | null) => void };
export type StockReportActionsSurfaceProps = { onRemove: () => void; disabled?: boolean };
export type StockMatchWarningSurfaceProps = Record<string, never>;

function lazyPage<T extends ComponentType<Record<string, never>>>(loader: () => Promise<{ default: T }>) { return lazyWithPreload(loader); }
const detail = lazyPage(() => import("./surfaces/StockReportDetailSlidePage").then((m) => ({ default: m.StockReportDetailSlidePage })));
const priority = lazyPage(() => import("./surfaces/StockReportPrioritySheetPage").then((m) => ({ default: m.StockReportPrioritySheetPage })));
const actions = lazyPage(() => import("./surfaces/StockReportActionsSheetPage").then((m) => ({ default: m.StockReportActionsSheetPage })));
const match = lazyPage(() => import("./surfaces/StockMatchWarningSheetPage").then((m) => ({ default: m.StockMatchWarningSheetPage })));

export const preloadStockReportDetailSurface = detail.preload;
export const preloadStockMatchWarningSurface = match.preload;
export const stockReportSurfaces: SurfaceRegistrations = {
  [STOCK_REPORT_DETAIL_SURFACE_ID]: { surface: "slide", component: detail.Component },
  [STOCK_REPORT_PRIORITY_SURFACE_ID]: { surface: "sheet", component: priority.Component },
  [STOCK_REPORT_ACTIONS_SURFACE_ID]: { surface: "sheet", component: actions.Component },
  [STOCK_MATCH_WARNING_SURFACE_ID]: { surface: "sheet", component: match.Component },
};
