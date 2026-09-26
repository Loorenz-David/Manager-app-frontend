import { useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@beyo/api-client";
import { useSurface } from "@beyo/hooks";
import { usePreloadSurface } from "@beyo/hooks";
import { notify, type MajorCategory } from "@beyo/lib";
import {
  toStockReportItemViewModel,
  type StockNeedBucket,
  type StockReportBoardBucket,
  type StockReportBoardMode,
  type StockReportListFilter,
} from "../stock-report.types";
import { useStockReportListQuery } from "../api/use-stock-report-queries";
import { stockReportListItems } from "../api/stock-report-list-cache";
import { useReorderStockReportItem, useSetStockReportPriority } from "../actions/use-stock-report-actions";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { preloadStockReportDetailSurface, STOCK_REPORT_DETAIL_SURFACE_ID, STOCK_REPORT_FILTER_SURFACE_ID, STOCK_REPORT_PRIORITY_SURFACE_ID } from "../surface-ids";

function boardErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  if (error instanceof ApiRequestError && error.code === "invalid_response") {
    console.error("[stock-report] board response rejected", error.message);
    return undefined;
  }
  return error.message;
}

/** The missing list offers every priority at once; Unset has no place on it. */
const MISSING_BUCKETS: readonly StockReportBoardBucket[] = ["all", "high", "medium", "low"];

export type StockReportBoardControllerOptions = {
  /**
   * `missing` is the buyer's list (owner, 2026-09-26): only snapshots with
   * `quantity_missing > 0`, opening on All. Everything else — detail, priority,
   * reorganise inside a priority bucket — works as on the board.
   */
  mode?: StockReportBoardMode;
};

export function useStockReportBoardController({ mode = "board" }: StockReportBoardControllerOptions = {}) {
  const permissions = useStockReportPermissions();
  const isMissingMode = mode === "missing";
  const [bucket, setBucket] = useState<StockReportBoardBucket>(isMissingMode ? "all" : permissions.seesUnset ? "unset" : "high");
  // The role default is the opening value only; the sheet's Clear returns to
  // it, and switching bucket or mode leaves it alone.
  const [filter, setFilter] = useState<StockReportListFilter>({ majorCategory: permissions.defaultMajorCategory, missingOnly: isMissingMode });
  const [searchValue, setSearchValue] = useState("");
  const [isReorganiseMode, setReorganiseMode] = useState(false);
  const openingResolved = useRef(isMissingMode || !permissions.seesUnset);
  const { open } = useSurface();
  usePreloadSurface(preloadStockReportDetailSurface);
  const list = useStockReportListQuery(bucket, filter);
  const rows = stockReportListItems(list.data);
  const setPriority = useSetStockReportPriority();
  const reorder = useReorderStockReportItem(bucket, filter);

  useEffect(() => {
    if (!permissions.seesUnset || openingResolved.current || bucket !== "unset" || !list.isSuccess) return;
    openingResolved.current = true;
    if (rows.length === 0) setBucket("high");
  }, [bucket, list.isSuccess, permissions.seesUnset, rows.length]);

  const cards = rows.flatMap((item) => {
    const mapped = toStockReportItemViewModel(item);
    return mapped && (bucket === "all" || mapped.bucket === bucket) ? [mapped.card] : [];
  });
  // Unset rows have no order; All mixes groups, so a drop there names no
  // position the backend could apply.
  const reorderAvailable =
    isReorganiseMode && bucket !== "unset" && bucket !== "all" && searchValue.trim().length === 0;

  return {
    mode,
    permissions,
    buckets: isMissingMode ? MISSING_BUCKETS : permissions.buckets,
    bucket,
    cards,
    searchValue,
    setSearchValue,
    filter,
    // The badge marks a departure from the role's opening view, not a narrowed
    // list: a worker on their default category sees none; anything else — a
    // different category, or "all" for a worker — counts as one (owner,
    // 2026-09-22).
    activeFilterCount: filter.majorCategory === permissions.defaultMajorCategory ? 0 : 1,
    status: list.isPending ? "loading" as const : list.isError && !list.data ? "error" as const : "ready" as const,
    // A schema mismatch carries the zod report as its message; that is for the
    // console, not the board, which then shows its generic copy (W-1).
    errorMessage: boardErrorMessage(list.error),
    refetch: list.refetchFromStart,
    hasMore: Boolean(list.hasNextPage),
    isLoadingMore: list.isFetchingNextPage,
    loadMore: () => list.fetchNextPage().then(() => undefined),
    isReorganiseMode,
    toggleReorganise: () => setReorganiseMode((current) => !current),
    // Do not let an appended page change sortable geometry underneath an
    // active pointer. The handle stays visible; it becomes live again as soon
    // as the request settles.
    reorderDisabled: reorder.isPending || list.isFetchingNextPage || !reorderAvailable,
    setBucket,
    openDetail: (stockNeedId: string) => open(STOCK_REPORT_DETAIL_SURFACE_ID, { stockNeedId }),
    openFilter: () =>
      open(STOCK_REPORT_FILTER_SURFACE_ID, {
        current: filter.majorCategory,
        initial: permissions.defaultMajorCategory,
        onApply: (majorCategory: MajorCategory | null) => setFilter((current) => ({ ...current, majorCategory })),
      }),
    openPriority: (stockNeedId: string) => {
      const row = rows.find((item) => item.client_id === stockNeedId);
      const currentPriority = row?.snapshot?.priority ?? null;
      const current = (currentPriority ?? "unset") as StockNeedBucket;
      open(STOCK_REPORT_PRIORITY_SURFACE_ID, { current, onSelect: (priority: "high" | "medium" | "low" | null) => { if (priority !== currentPriority) setPriority.mutate({ stockNeedId, priority }); } });
    },
    // The board hands over the row that was dropped onto, and its own
    // `priority_order` is the target. Never the visible index: the list the
    // board shows is a filtered slice of the priority group the backend orders
    // within, so the two agree only by luck (owner report, 2026-09-22).
    reorder: (stockNeedId: string, targetStockNeedId: string) => {
      if (!reorderAvailable) return;
      const targetOrder = rows.find((item) => item.client_id === targetStockNeedId)?.snapshot?.priority_order;
      if (targetOrder == null) {
        // A prioritised row always carries an order; the backend pairs the two
        // columns and its own consistency check flags any row that breaks the
        // pairing. Sending a guess would move the wrong row.
        console.error("[stock-report] reorder target has no priority_order", targetStockNeedId);
        notify.error("Order not changed", "That position could not be read. Pull to refresh and try again.");
        return;
      }
      reorder.mutate({ stockNeedId, targetOrder });
    },
  };
}

export type StockReportBoardController = ReturnType<typeof useStockReportBoardController>;
