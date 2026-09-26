import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import type { StockReportItem } from "../stock-report.types";
import type { StockReportItemPage } from "./stock-report-api";
import { stockReportKeys } from "./stock-report-keys";

export type StockReportItemListData = InfiniteData<StockReportItemPage, unknown>;

export function stockReportListItems(data: StockReportItem[]): StockReportItem[];
export function stockReportListItems(data: StockReportItemListData | undefined): StockReportItem[];
export function stockReportListItems(
  data: StockReportItemListData | StockReportItem[] | undefined,
): StockReportItem[] {
  // Tolerate a pre-pagination cache during hot reload or persisted-cache
  // hydration; new queries always write InfiniteData.
  if (Array.isArray(data)) return data;
  return data?.pages.flatMap((page) => page.items) ?? [];
}

/**
 * Applies an optimistic update across all loaded pages, then restores the
 * existing page boundaries. The authoritative settle-time read always starts
 * again at offset zero, so temporary page metadata does not escape a mutation.
 */
export function updateStockReportListItems(
  data: StockReportItem[],
  update: (items: StockReportItem[]) => StockReportItem[],
): StockReportItem[];
export function updateStockReportListItems(
  data: StockReportItemListData | undefined,
  update: (items: StockReportItem[]) => StockReportItem[],
): StockReportItemListData | undefined;
export function updateStockReportListItems(
  data: StockReportItemListData | StockReportItem[] | undefined,
  update: (items: StockReportItem[]) => StockReportItem[],
): StockReportItemListData | StockReportItem[] | undefined {
  if (!data) return data;
  if (Array.isArray(data)) return update(data);

  const nextItems = update(stockReportListItems(data));
  let cursor = 0;
  return {
    ...data,
    pages: data.pages.map((page, index) => {
      const isLastPage = index === data.pages.length - 1;
      const end = isLastPage ? nextItems.length : cursor + page.items.length;
      const items = nextItems.slice(cursor, end);
      cursor = end;
      return { ...page, items };
    }),
  };
}

/**
 * Offset pages become invalid as soon as the board moves. Keep the first page
 * visible, discard every later offset, and refetch active lists from zero.
 */
export function trimStockReportListQueriesToFirstPage(
  queryClient: QueryClient,
  queryKey: QueryKey = stockReportKeys.lists(),
): void {
  for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey })) {
    if (!data || Array.isArray(data) || data.pages.length <= 1) continue;
    queryClient.setQueryData<StockReportItemListData>(key, {
      pages: data.pages.slice(0, 1),
      pageParams: data.pageParams.slice(0, 1),
    });
  }
}

export function restartStockReportListQueries(
  queryClient: QueryClient,
  queryKey: QueryKey = stockReportKeys.lists(),
): void {
  trimStockReportListQueriesToFirstPage(queryClient, queryKey);
  void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
}
