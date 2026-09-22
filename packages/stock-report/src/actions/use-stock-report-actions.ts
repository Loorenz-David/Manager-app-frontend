import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type { StockNeedBucket, StockReportAssignment, StockReportItem, StockReportListFilter, StockReportPriority } from "../stock-report.types";
import { createStockAssignment, removeStockAssignment, reorderStockReportItem, setStockReportPriority } from "../api/stock-report-api";
import { stockReportKeys } from "../api/stock-report-keys";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";

/**
 * The server's own move, applied to the cache.
 *
 * `PATCH .../priority-order` sets the moved row's `priority_order` to `target`
 * and shifts everything it passed over by one, then the board reads the group
 * back sorted by that column. Reproducing the arithmetic rather than splicing
 * the array keeps every cached row's `priority_order` true while the request is
 * in flight — and that column is what the *next* drag's target is read from, so
 * a cache that merely looked right would hand the following drag a stale
 * position.
 *
 * Only the rows the board can see are shifted. Rows the list query hides (a
 * `quantity_requested` of 0, or a major-category filter) shift server-side too;
 * the refetch brings them back in step.
 */
function applyPriorityOrderMove(
  rows: readonly StockReportItem[],
  stockNeedId: string,
  target: number,
): StockReportItem[] {
  const mover = rows.find((row) => row.client_id === stockNeedId);
  const position = mover?.priority_order;
  if (position == null || position === target) return [...rows];

  return rows
    .map((row) => {
      if (row.client_id === stockNeedId) return { ...row, priority_order: target };
      const order = row.priority_order;
      if (order == null) return row;
      if (target > position && order > position && order <= target) {
        return { ...row, priority_order: order - 1 };
      }
      if (target < position && order >= target && order < position) {
        return { ...row, priority_order: order + 1 };
      }
      return row;
    })
    .toSorted(
      (a, b) =>
        (a.priority_order ?? Number.MAX_SAFE_INTEGER) -
        (b.priority_order ?? Number.MAX_SAFE_INTEGER),
    );
}

export function useSetStockReportPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockNeedId, priority }: { stockNeedId: string; priority: StockReportPriority | null }) => setStockReportPriority(stockNeedId, priority),
    onMutate: async ({ stockNeedId, priority }) => {
      const previous = queryClient.getQueriesData<StockReportItem[]>({ queryKey: stockReportKeys.lists() });
      for (const [key, rows] of previous) queryClient.setQueryData<StockReportItem[]>(key, (rows ?? []).filter((row) => row.client_id !== stockNeedId));
      const destination: StockNeedBucket = priority ?? "unset";
      const moved = { ...(previous.flatMap(([, rows]) => rows ?? []).find((row) => row.client_id === stockNeedId) ?? { client_id: stockNeedId }), priority } as StockReportItem;
      // Every cached list of the destination bucket, whatever its category
      // filter: the settle-time invalidation refetches the active one anyway.
      for (const [key] of queryClient.getQueriesData<StockReportItem[]>({ queryKey: stockReportKeys.bucketLists(destination) })) {
        queryClient.setQueryData<StockReportItem[]>(key, (rows = []) => [...rows.filter((row) => row.client_id !== stockNeedId), moved]);
      }
      return { previous };
    },
    // The rollback alone would snap the card back with no explanation (W-3).
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, rows]) => queryClient.setQueryData(key, rows));
      notify.error("Priority not changed", stockReportRequestFailureMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: stockReportKeys.lists(), refetchType: "active" }),
  });
}

export function useReorderStockReportItem(bucket: StockNeedBucket, filter: StockReportListFilter) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockNeedId, targetOrder }: { stockNeedId: string; targetOrder: number }) => reorderStockReportItem(stockNeedId, targetOrder),
    onMutate: async ({ stockNeedId, targetOrder }) => {
      const key = stockReportKeys.list(bucket, filter);
      const previous = queryClient.getQueryData<StockReportItem[]>(key);
      if (previous) queryClient.setQueryData(key, applyPriorityOrderMove(previous, stockNeedId, targetOrder));
      return { key, previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(context?.key ?? stockReportKeys.list(bucket, filter), context?.previous);
      notify.error("Order not changed", stockReportRequestFailureMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: stockReportKeys.list(bucket, filter), refetchType: "active" }),
  });
}

export function useCreateStockAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockAssignment,
    onSuccess: (assignment) => queryClient.setQueryData(stockReportKeys.assignmentList(assignment.stock_report_item_id), (rows: unknown[] | undefined) => [...(rows ?? []), assignment]),
  });
}

export function useRemoveStockAssignment(stockNeedId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeStockAssignment,
    onMutate: async (assignmentId) => {
      const key = stockReportKeys.assignmentList(stockNeedId);
      const previous = queryClient.getQueryData<StockReportAssignment[]>(key);
      queryClient.setQueryData<StockReportAssignment[]>(key, (rows = []) => rows.filter((row) => row.client_id !== assignmentId));
      return { key, previous };
    },
    onError: (_error, _id, context) => queryClient.setQueryData(context?.key ?? stockReportKeys.assignmentList(stockNeedId), context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: stockReportKeys.assignmentList(stockNeedId), refetchType: "active" }),
  });
}
