import { useState } from "react";
import {
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  preloadStockReportBoardSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionHistorySurface,
  stockReportRequestFailureMessage,
  toStockReportVersionViewModel,
  useCreateStockReportVersion,
  useStockReportActiveVersionQuery,
  useStockReportMissingSummaryQuery,
  useStockReportPermissions,
  type StockReportLoadStatus,
  type StockReportMissingSummary,
  type StockReportVersionViewModel,
} from "@beyo/stock-report";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { useSurface } from "@/hooks/use-surface";

export type StockVersionCreatePhase = "idle" | "creating" | "failed";

/**
 * The manager's stock report hub (owner, 2026-09-26): the active version's
 * progress by priority, the missing-stock total, and the two capabilities
 * beside them — opening a new version and reading the history. The board,
 * the missing list and the history each open as a slide page surface (the
 * owner dropped the earlier hub → board slide stack).
 *
 * Navigation after a successful create is the caller's, not the action's:
 * `createVersion` takes what to do once the backend has answered.
 */
export function useStockReportHubController() {
  const permissions = useStockReportPermissions();
  const surface = useSurface();
  usePreloadSurface(preloadStockReportBoardSurface);
  usePreloadSurface(preloadStockReportMissingSurface);
  usePreloadSurface(preloadStockReportVersionHistorySurface);
  const activeVersion = useStockReportActiveVersionQuery();
  const missingSummary = useStockReportMissingSummaryQuery();
  const createVersion = useCreateStockReportVersion();
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
  const createPhase: StockVersionCreatePhase = createVersion.isPending
    ? "creating"
    : createVersion.isError
      ? "failed"
      : "idle";
  const summary: StockReportMissingSummary | null = missingSummary.data ?? null;

  return {
    permissions,
    version,
    versionStatus,
    missingSummary: summary,
    createPhase,
    createErrorMessage: createVersion.isError
      ? stockReportRequestFailureMessage(createVersion.error)
      : undefined,
    createVersion: (onCreated: () => void) =>
      createVersion.mutate(undefined, { onSuccess: onCreated }),
    dismissCreateFailure: () => createVersion.reset(),
    openBoard: () => surface.open(STOCK_REPORT_BOARD_SURFACE_ID, {}),
    openMissing: () => surface.open(STOCK_REPORT_MISSING_SURFACE_ID, {}),
    openHistory: () => surface.open(STOCK_REPORT_VERSION_HISTORY_SURFACE_ID, {}),
    refetch: () =>
      Promise.all([activeVersion.refetch(), missingSummary.refetch()]).then(() => undefined),
  };
}

export type StockReportHubController = ReturnType<typeof useStockReportHubController>;
