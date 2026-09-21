import { useEffect, useRef, useState } from "react";
import { useSurface } from "@beyo/hooks";
import { usePreloadSurface } from "@beyo/hooks";
import { toStockReportItemViewModel, type StockNeedBucket } from "../stock-report.types";
import { useStockReportListQuery } from "../api/use-stock-report-queries";
import { useReorderStockReportItem, useSetStockReportPriority } from "../actions/use-stock-report-actions";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { preloadStockReportDetailSurface, STOCK_REPORT_DETAIL_SURFACE_ID, STOCK_REPORT_PRIORITY_SURFACE_ID } from "../surface-ids";

export function useStockReportBoardController() {
  const permissions = useStockReportPermissions();
  const [bucket, setBucket] = useState<StockNeedBucket>(permissions.seesUnset ? "unset" : "high");
  const [searchValue, setSearchValue] = useState("");
  const [isReorganiseMode, setReorganiseMode] = useState(false);
  const openingResolved = useRef(!permissions.seesUnset);
  const { open } = useSurface();
  usePreloadSurface(preloadStockReportDetailSurface);
  const list = useStockReportListQuery(bucket);
  const setPriority = useSetStockReportPriority();
  const reorder = useReorderStockReportItem(bucket);

  useEffect(() => {
    if (!permissions.seesUnset || openingResolved.current || bucket !== "unset" || !list.isSuccess) return;
    openingResolved.current = true;
    if (list.data.length === 0) setBucket("high");
  }, [bucket, list.data, list.isSuccess, permissions.seesUnset]);

  const cards = (list.data ?? []).flatMap((item) => {
    const mapped = toStockReportItemViewModel(item);
    return mapped?.bucket === bucket ? [mapped.card] : [];
  });
  const reorderAvailable = isReorganiseMode && bucket !== "unset" && searchValue.trim().length === 0;

  return {
    permissions,
    bucket,
    cards,
    searchValue,
    setSearchValue,
    status: list.isPending ? "loading" as const : list.isError ? "error" as const : "ready" as const,
    errorMessage: list.error instanceof Error ? list.error.message : undefined,
    refetch: list.refetch,
    isReorganiseMode,
    toggleReorganise: () => setReorganiseMode((current) => !current),
    reorderDisabled: reorder.isPending || !reorderAvailable,
    setBucket,
    openDetail: (stockNeedId: string) => open(STOCK_REPORT_DETAIL_SURFACE_ID, { stockNeedId }),
    openPriority: (stockNeedId: string) => {
      const row = list.data?.find((item) => item.client_id === stockNeedId);
      const current = (row?.priority ?? "unset") as StockNeedBucket;
      open(STOCK_REPORT_PRIORITY_SURFACE_ID, { current, onSelect: (priority: "high" | "medium" | "low" | null) => { if (priority !== row?.priority) setPriority.mutate({ stockNeedId, priority }); } });
    },
    reorder: (stockNeedId: string, toIndex: number) => { if (reorderAvailable) reorder.mutate({ stockNeedId, toIndex }); },
  };
}
