import { useState } from "react";
import {
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFTS_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_FORM_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  preloadStockReportBoardSurface,
  preloadStockReportDraftsSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionFormSurface,
  preloadStockReportVersionHistorySurface,
  toStockReportVersionViewModel,
  useStockReportActiveVersionQuery,
  useStockReportDraftCountQuery,
  useStockReportMissingSummaryQuery,
  useStockReportPermissions,
  type StockReportLoadStatus,
  type StockReportMissingSummary,
  type StockReportVersionViewModel,
} from "@beyo/stock-report";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { useSurface } from "@/hooks/use-surface";

/**
 * The manager's stock report hub (owner, 2026-09-26): the active version's
 * progress by priority, the missing-stock total, and the capabilities beside
 * them — the drafts, the history and a new version. Every one opens as a
 * surface on top of the hub.
 *
 * Creating a version is the form's job now (plan OC-2): the hub only opens it,
 * and the form decides where the user lands once the backend has answered.
 */
export function useStockReportHubController() {
  const permissions = useStockReportPermissions();
  const surface = useSurface();
  usePreloadSurface(preloadStockReportBoardSurface);
  usePreloadSurface(preloadStockReportMissingSurface);
  usePreloadSurface(preloadStockReportVersionHistorySurface);
  usePreloadSurface(preloadStockReportDraftsSurface);
  usePreloadSurface(preloadStockReportVersionFormSurface);
  const activeVersion = useStockReportActiveVersionQuery();
  const missingSummary = useStockReportMissingSummaryQuery();
  const draftCount = useStockReportDraftCountQuery();
  // Read once per mount: the hub remounts on every tab visit, and a day
  // boundary crossing while it is open is not worth an impure render.
  const [now] = useState(() => Date.now());

  const version: StockReportVersionViewModel | null = activeVersion.data
    ? toStockReportVersionViewModel(activeVersion.data, now)
    : null;
  const versionStatus: StockReportLoadStatus = activeVersion.isPending
    ? "loading"
    : activeVersion.isError
      ? "error"
      : "ready";
  const summary: StockReportMissingSummary | null = missingSummary.data ?? null;

  return {
    permissions,
    version,
    versionStatus,
    missingSummary: summary,
    /** `undefined` until loaded (and on error): the button then reads "Drafts". */
    draftCount: draftCount.data,
    openBoard: () => surface.open(STOCK_REPORT_BOARD_SURFACE_ID, {}),
    openMissing: () => surface.open(STOCK_REPORT_MISSING_SURFACE_ID, {}),
    openHistory: () => surface.open(STOCK_REPORT_VERSION_HISTORY_SURFACE_ID, {}),
    openDrafts: () => surface.open(STOCK_REPORT_DRAFTS_SURFACE_ID, {}),
    openCreateForm: () => surface.open(STOCK_REPORT_VERSION_FORM_SURFACE_ID, {}),
    refetch: () =>
      Promise.all([activeVersion.refetch(), missingSummary.refetch(), draftCount.refetch()]).then(
        () => undefined,
      ),
  };
}

export type StockReportHubController = ReturnType<typeof useStockReportHubController>;
