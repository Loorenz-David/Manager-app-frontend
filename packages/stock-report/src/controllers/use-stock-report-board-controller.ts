import { useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@beyo/api-client";
import { useSurface } from "@beyo/hooks";
import { usePreloadSurface } from "@beyo/hooks";
import type { MajorCategory } from "@beyo/lib";
import { toStockReportItemViewModel, type StockNeedBucket, type StockReportListFilter } from "../stock-report.types";
import { useStockReportListQuery } from "../api/use-stock-report-queries";
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

export function useStockReportBoardController() {
  const permissions = useStockReportPermissions();
  const [bucket, setBucket] = useState<StockNeedBucket>(permissions.seesUnset ? "unset" : "high");
  // The role default is the opening value only; the sheet's Clear returns to
  // it, and switching bucket or mode leaves it alone.
  const [filter, setFilter] = useState<StockReportListFilter>({ majorCategory: permissions.defaultMajorCategory });
  const [searchValue, setSearchValue] = useState("");
  const [isReorganiseMode, setReorganiseMode] = useState(false);
  const openingResolved = useRef(!permissions.seesUnset);
  const { open } = useSurface();
  usePreloadSurface(preloadStockReportDetailSurface);
  const list = useStockReportListQuery(bucket, filter);
  const setPriority = useSetStockReportPriority();
  const reorder = useReorderStockReportItem(bucket, filter);

  useEffect(() => {
    if (!permissions.seesUnset || openingResolved.current || bucket !== "unset" || !list.isSuccess) return;
    openingResolved.current = true;
    if (list.data.length === 0) setBucket("high");
  }, [bucket, list.data, list.isSuccess, permissions.seesUnset]);

  const cards = (list.data ?? []).flatMap((item) => {
    const mapped = toStockReportItemViewModel(item);
    return mapped?.bucket === bucket ? [mapped.card] : [];
  });
  const reorderAvailable =
    isReorganiseMode && bucket !== "unset" && searchValue.trim().length === 0;

  return {
    permissions,
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
    status: list.isPending ? "loading" as const : list.isError ? "error" as const : "ready" as const,
    // A schema mismatch carries the zod report as its message; that is for the
    // console, not the board, which then shows its generic copy (W-1).
    errorMessage: boardErrorMessage(list.error),
    refetch: list.refetch,
    isReorganiseMode,
    toggleReorganise: () => setReorganiseMode((current) => !current),
    reorderDisabled: reorder.isPending || !reorderAvailable,
    setBucket,
    openDetail: (stockNeedId: string) => open(STOCK_REPORT_DETAIL_SURFACE_ID, { stockNeedId }),
    openFilter: () =>
      open(STOCK_REPORT_FILTER_SURFACE_ID, {
        current: filter.majorCategory,
        initial: permissions.defaultMajorCategory,
        onApply: (majorCategory: MajorCategory | null) => setFilter({ majorCategory }),
      }),
    openPriority: (stockNeedId: string) => {
      const row = list.data?.find((item) => item.client_id === stockNeedId);
      const current = (row?.priority ?? "unset") as StockNeedBucket;
      open(STOCK_REPORT_PRIORITY_SURFACE_ID, { current, onSelect: (priority: "high" | "medium" | "low" | null) => { if (priority !== row?.priority) setPriority.mutate({ stockNeedId, priority }); } });
    },
    reorder: (stockNeedId: string, toIndex: number) => { if (reorderAvailable) reorder.mutate({ stockNeedId, toIndex }); },
  };
}
