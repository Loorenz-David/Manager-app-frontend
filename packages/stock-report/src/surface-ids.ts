import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import type { MajorCategory } from "@beyo/lib";
import type { ComponentType } from "react";
import type { StockMatchWarningSheetContentProps } from "./components/sheets/StockMatchWarningSheetContent";
import type { StockReportLegendSheetContentProps } from "./components/sheets/StockReportLegendSheetContent";
import type { StockReportRequestedSource, StockReportVersionScope } from "./stock-report.types";

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
/** One draft's board (plan §C.4). */
export const STOCK_REPORT_DRAFT_BOARD_SURFACE_ID = "stock-report-draft-board-slide";
/** The version's ⋮ menu — edit, refresh, activate, delete (plan §G.5). */
export const STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID = "stock-report-version-actions-sheet";
/** The requested-quantity sheet, from the detail page's ⋮ (plan §G.7, OC-10). */
export const STOCK_REPORT_REQUESTED_SURFACE_ID = "stock-report-requested-sheet";
/** Create a version or edit one (plan §F.1). */
export const STOCK_REPORT_VERSION_FORM_SURFACE_ID = "stock-report-version-form-slide";
/** The version form's schedule picker (plan §F.5, OC-9). */
export const STOCK_REPORT_SCHEDULE_SURFACE_ID = "stock-report-schedule-sheet";
/** Every draft, each opening its own board (plan §G.3). */
export const STOCK_REPORT_DRAFTS_SURFACE_ID = "stock-report-drafts-slide";
/** Refresh the live version from Scanner, after a plain-words choice (plan §G.9, OC-12). */
export const STOCK_REPORT_REFRESH_SURFACE_ID = "stock-report-refresh-sheet";
/** Activate a draft now, or choose what its scheduled activation does (plan §G.10, OC-15, OC-16). */
export const STOCK_REPORT_ACTIVATE_SURFACE_ID = "stock-report-activate-sheet";

/** `versionId` absent = the board (the active version); an id = that version's row (plan §3.1). */
export type StockReportDetailSurfaceProps = { stockNeedId: string; versionId?: string };
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
  /** Whether the missing rows render at all (projection R3); sellers get the requested row alone. */
  canMarkMissing?: boolean;
  /** "Set requested quantity" (OC-10) — present for the roles that prioritise. */
  onSetRequested?: () => void;
  /** "Follow the live version" (OC-14) — present on a draft row with its own missing count. */
  onFollowLive?: () => void;
  disabled?: boolean;
};
/** The summary card's five numbers, so the sheet draws the same bar it explains. */
export type StockReportLegendSurfaceProps = StockReportLegendSheetContentProps;
export type StockReportDraftBoardSurfaceProps = { versionId: string };
export type StockReportVersionActionsSurfaceProps = { versionId: string };
/**
 * `versionId` is what the request names — on the board the active version's
 * id, read from the row's own snapshot (projection R4); `scope` is the cache
 * the page reads (`"active"` on the board, the version id on a draft).
 */
export type StockReportRequestedSurfaceProps = {
  stockNeedId: string;
  versionId: string;
  scope: StockReportVersionScope;
  current: number;
  source: StockReportRequestedSource;
  scanner: number;
};

/** `versionId` absent = create (plan §F.1). */
export type StockReportVersionFormSurfaceProps = { versionId?: string };
export type StockReportScheduleSurfaceProps = { current: string | null; onSelect: (iso: string | null) => void };
export type StockReportDraftsSurfaceProps = Record<string, never>;
export type StockReportRefreshSurfaceProps = { versionId: string };
/**
 * One sheet, two callers (plan §G.10). The version actions sheet passes the
 * version and the page activates it itself; the version form passes what it
 * is about to store and an `onConfirm` — the page then only relays the choice
 * and the form sends the request (§3.3).
 */
export type StockReportActivateSurfaceProps =
  | { mode: "activate"; versionId: string }
  | {
      mode: "schedule" | "activate";
      title: string;
      scheduledAt?: string | null;
      initialKeep: boolean;
      onConfirm: (keepActiveMissing: boolean) => void;
    };

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
const draftBoard = lazyPage(() => import("./surfaces/StockReportDraftBoardSlidePage").then((m) => ({ default: m.StockReportDraftBoardSlidePage })));
const versionActions = lazyPage(() => import("./surfaces/StockReportVersionActionsSheetPage").then((m) => ({ default: m.StockReportVersionActionsSheetPage })));
const requested = lazyPage(() => import("./surfaces/StockReportRequestedSheetPage").then((m) => ({ default: m.StockReportRequestedSheetPage })));
const versionForm = lazyPage(() => import("./surfaces/StockReportVersionFormSlidePage").then((m) => ({ default: m.StockReportVersionFormSlidePage })));
const schedule = lazyPage(() => import("./surfaces/StockReportScheduleSheetPage").then((m) => ({ default: m.StockReportScheduleSheetPage })));
const drafts = lazyPage(() => import("./surfaces/StockReportDraftsSlidePage").then((m) => ({ default: m.StockReportDraftsSlidePage })));
const refresh = lazyPage(() => import("./surfaces/StockReportRefreshSheetPage").then((m) => ({ default: m.StockReportRefreshSheetPage })));
const activate = lazyPage(() => import("./surfaces/StockReportActivateSheetPage").then((m) => ({ default: m.StockReportActivateSheetPage })));

export const preloadStockReportDetailSurface = detail.preload;
export const preloadStockMatchWarningSurface = match.preload;
export const preloadStockReportBoardSurface = board.preload;
export const preloadStockReportMissingSurface = missing.preload;
export const preloadStockReportVersionHistorySurface = history.preload;
export const preloadStockReportDetailMenuSurface = detailMenu.preload;
export const preloadStockReportLegendSurface = legend.preload;
export const preloadStockReportDraftBoardSurface = draftBoard.preload;
export const preloadStockReportVersionActionsSurface = versionActions.preload;
export const preloadStockReportRequestedSurface = requested.preload;
export const preloadStockReportVersionFormSurface = versionForm.preload;
export const preloadStockReportScheduleSurface = schedule.preload;
export const preloadStockReportDraftsSurface = drafts.preload;
export const preloadStockReportRefreshSurface = refresh.preload;
export const preloadStockReportActivateSurface = activate.preload;
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
  [STOCK_REPORT_DRAFT_BOARD_SURFACE_ID]: { surface: "slide", component: draftBoard.Component },
  [STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID]: { surface: "sheet", component: versionActions.Component },
  [STOCK_REPORT_REQUESTED_SURFACE_ID]: { surface: "sheet", component: requested.Component },
  [STOCK_REPORT_VERSION_FORM_SURFACE_ID]: { surface: "slide", component: versionForm.Component },
  [STOCK_REPORT_SCHEDULE_SURFACE_ID]: { surface: "sheet", component: schedule.Component },
  [STOCK_REPORT_DRAFTS_SURFACE_ID]: { surface: "slide", component: drafts.Component },
  [STOCK_REPORT_REFRESH_SURFACE_ID]: { surface: "sheet", component: refresh.Component },
  [STOCK_REPORT_ACTIVATE_SURFACE_ID]: { surface: "sheet", component: activate.Component },
};
