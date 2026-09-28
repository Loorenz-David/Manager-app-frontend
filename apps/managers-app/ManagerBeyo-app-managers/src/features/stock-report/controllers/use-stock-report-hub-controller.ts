import { useState } from "react";
import { notify } from "@beyo/lib";
import {
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFTS_SURFACE_ID,
  STOCK_REPORT_MISSING_SURFACE_ID,
  STOCK_REPORT_VERSION_HISTORY_SURFACE_ID,
  newStockDraftBody,
  preloadStockReportBoardSurface,
  preloadStockReportDraftBoardSurface,
  preloadStockReportDraftsSurface,
  preloadStockReportMissingSurface,
  preloadStockReportVersionHistorySurface,
  stockReportRequestFailureMessage,
  toStockReportVersionViewModel,
  useCreateStockReportVersion,
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
 * **+ New Draft** creates in one tap (owner, 2026-09-28): the body an
 * untouched create form would send — a draft under the day's placeholder
 * title, no schedule — then the new draft's board opens. A draft closes
 * nothing, so there is nothing to confirm. The version form is reached only
 * through Edit now. A failure toasts here: the create action leaves its
 * failure surface to the caller.
 */
export function useStockReportHubController() {
  const permissions = useStockReportPermissions();
  const surface = useSurface();
  usePreloadSurface(preloadStockReportBoardSurface);
  usePreloadSurface(preloadStockReportMissingSurface);
  usePreloadSurface(preloadStockReportVersionHistorySurface);
  usePreloadSurface(preloadStockReportDraftsSurface);
  usePreloadSurface(preloadStockReportDraftBoardSurface);
  const activeVersion = useStockReportActiveVersionQuery();
  const missingSummary = useStockReportMissingSummaryQuery();
  const draftCount = useStockReportDraftCountQuery();
  const create = useCreateStockReportVersion();
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
    isCreatingDraft: create.isPending,
    createDraft: () => {
      if (create.isPending) return;
      // Read at tap time, so the title is the day the draft was made.
      create.mutate(newStockDraftBody(Date.now()), {
        onSuccess: (row) => surface.open(STOCK_REPORT_DRAFT_BOARD_SURFACE_ID, { versionId: row.client_id }),
        onError: (error) => notify.error("Draft not created", stockReportRequestFailureMessage(error)),
      });
    },
    refetch: () =>
      Promise.all([activeVersion.refetch(), missingSummary.refetch(), draftCount.refetch()]).then(
        () => undefined,
      ),
  };
}

export type StockReportHubController = ReturnType<typeof useStockReportHubController>;
