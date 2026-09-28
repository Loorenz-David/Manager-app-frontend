import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import {
  STOCK_REPORT_ACTIVE_SCOPE,
  type StockReportItem,
  type StockReportVersionScope,
} from "../stock-report.types";
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

/**
 * One version's lists — and, for a draft, its own version entry — are dropped
 * after the version was activated or deleted (plan §D.2, §E.5, §E.7;
 * projection R11). Nobody observes most of them, so they are simply removed.
 * An observed one belongs to a mounted page:
 *
 * - a draft's page closes itself once its version query stops saying
 *   `draft` (§C.4), so its in-flight reads are cancelled and **not** refetched
 *   — no skeleton flash, no request against a deleted version;
 * - the active board has no exit rule: its observed lists are reset so the
 *   page fetches the new version's rows instead of painting the closed
 *   version's priorities first.
 */
export function dropStockReportVersionQueries(
  queryClient: QueryClient,
  scope: StockReportVersionScope,
): void {
  const prefixes: QueryKey[] = [stockReportKeys.versionLists(scope)];
  if (scope !== STOCK_REPORT_ACTIVE_SCOPE) prefixes.push(stockReportKeys.version(scope));
  for (const queryKey of prefixes) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
      const exact = { queryKey: query.queryKey, exact: true } as const;
      if (query.getObserversCount() === 0) queryClient.removeQueries(exact);
      else if (scope === STOCK_REPORT_ACTIVE_SCOPE) void queryClient.resetQueries(exact);
      else void queryClient.cancelQueries(exact);
    }
  }
}

/** The draft scopes of every cached list — the versions someone opened besides the board. */
export function cachedStockReportDraftScopes(queryClient: QueryClient): StockReportVersionScope[] {
  const scopes = new Set<StockReportVersionScope>();
  for (const query of queryClient.getQueryCache().findAll({ queryKey: stockReportKeys.lists() })) {
    const scope = stockReportKeys.versionScopeOfListKey(query.queryKey);
    if (scope !== undefined && scope !== STOCK_REPORT_ACTIVE_SCOPE) scopes.add(scope);
  }
  return [...scopes];
}
