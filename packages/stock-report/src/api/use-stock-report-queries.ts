import { useCallback } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  StockReportBoardBucket,
  StockReportListFilter,
  StockReportVersionState,
} from "../stock-report.types";
import {
  fetchActiveStockReportVersion,
  fetchStockReportAssignments,
  fetchStockReportDraftCount,
  fetchStockReportItems,
  fetchStockReportMissingSummary,
  fetchStockReportVersion,
  fetchStockReportVersions,
  progressPriorityParam,
  STOCK_REPORT_PROGRESS_PRIORITIES,
  type StockReportProgressPriorityFilter,
} from "./stock-report-api";
import { stockReportKeys } from "./stock-report-keys";
import { trimStockReportListQueriesToFirstPage } from "./stock-report-list-cache";

export const STOCK_REPORT_STALE_TIME = 60_000;
/** The board endpoint's default page; explicit on every request (§5.1). */
export const STOCK_REPORT_ITEM_PAGE_SIZE = 20;
/** The backend default page (§5.9); the history page loads more on demand. */
export const STOCK_REPORT_VERSION_PAGE_SIZE = 20;

/** A 404 is an answer (the row or version is gone), not a transient failure. */
function isNotFound(error: unknown): boolean {
  return error instanceof Error && "status" in error && (error as { status: number }).status === 404;
}
function retryUnlessNotFound(count: number, error: unknown): boolean {
  return !isNotFound(error) && count < 1;
}

export function useStockReportListQuery(bucket: StockReportBoardBucket, filter: StockReportListFilter) {
  const queryClient = useQueryClient();
  const queryKey = stockReportKeys.list(bucket, filter);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchStockReportItems(bucket, filter, { limit: STOCK_REPORT_ITEM_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    staleTime: STOCK_REPORT_STALE_TIME,
  });
  const refetchFromStart = useCallback(async (): Promise<void> => {
    trimStockReportListQueriesToFirstPage(queryClient, queryKey);
    await query.refetch();
  }, [queryClient, query.refetch, queryKey]);

  return { ...query, refetchFromStart };
}

export function useStockReportAssignmentsQuery(stockNeedId: string) {
  return useQuery({ queryKey: stockReportKeys.assignmentList(stockNeedId), queryFn: () => fetchStockReportAssignments(stockNeedId), enabled: Boolean(stockNeedId), staleTime: STOCK_REPORT_STALE_TIME, retry: retryUnlessNotFound });
}

export function prefetchStockReportAssignmentsData(queryClient: QueryClient, stockNeedId: string): Promise<void> {
  return queryClient.prefetchQuery({ queryKey: stockReportKeys.assignmentList(stockNeedId), queryFn: () => fetchStockReportAssignments(stockNeedId), staleTime: STOCK_REPORT_STALE_TIME });
}

/** `priorities` selects the snapshots `progress` sums; the three priorities by default (owner, 2026-09-26). */
export function useStockReportActiveVersionQuery(priorities: StockReportProgressPriorityFilter = STOCK_REPORT_PROGRESS_PRIORITIES) {
  const progressPriority = progressPriorityParam(priorities);
  return useQuery({
    queryKey: stockReportKeys.activeVersion(progressPriority),
    queryFn: () => fetchActiveStockReportVersion(priorities),
    staleTime: STOCK_REPORT_STALE_TIME,
  });
}

/**
 * One version by id (v7 §5.13), any state. No `initialData` from a list: the
 * progress filters must match, and a stale draft preview is worse than one
 * request. A 404 (a deleted draft) is not retried — the page reads it as
 * its exit signal.
 */
export function useStockReportVersionQuery(
  versionId: string | null,
  priorities: StockReportProgressPriorityFilter = STOCK_REPORT_PROGRESS_PRIORITIES,
) {
  const progressPriority = progressPriorityParam(priorities);
  return useQuery({
    queryKey: stockReportKeys.version(versionId ?? "", progressPriority),
    queryFn: () => fetchStockReportVersion(versionId ?? "", priorities),
    enabled: versionId !== null && versionId.length > 0,
    staleTime: STOCK_REPORT_STALE_TIME,
    retry: retryUnlessNotFound,
  });
}

/** v10 §5.23 — the hub badge; refetched on the three version events that change it. */
export function useStockReportDraftCountQuery() {
  return useQuery({
    queryKey: stockReportKeys.draftCount(),
    queryFn: fetchStockReportDraftCount,
    staleTime: STOCK_REPORT_STALE_TIME,
  });
}

export function useStockReportMissingSummaryQuery() {
  return useQuery({ queryKey: stockReportKeys.missingSummary(), queryFn: fetchStockReportMissingSummary, staleTime: STOCK_REPORT_STALE_TIME });
}

/**
 * Offset pagination: the next page starts where the last one's `offset + limit`
 * ends. `priorities` selects the snapshots each row's `progress` sums;
 * `states` narrows the rows (v10 §5.9), empty = every state, drafts first.
 */
export function useStockReportVersionsQuery({
  priorities = STOCK_REPORT_PROGRESS_PRIORITIES,
  states = [],
}: {
  priorities?: StockReportProgressPriorityFilter;
  states?: readonly StockReportVersionState[];
} = {}) {
  const progressPriority = progressPriorityParam(priorities);
  return useInfiniteQuery({
    queryKey: stockReportKeys.versionList({ states, progressPriority }),
    queryFn: ({ pageParam }) => fetchStockReportVersions({ limit: STOCK_REPORT_VERSION_PAGE_SIZE, offset: pageParam, priorities, states }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined),
    staleTime: STOCK_REPORT_STALE_TIME,
  });
}
