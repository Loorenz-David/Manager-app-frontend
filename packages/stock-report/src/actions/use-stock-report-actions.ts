import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type { StockNeedBucket, StockReportAssignment, StockReportItem, StockReportListFilter, StockReportPriority } from "../stock-report.types";
import { createStockAssignment, removeStockAssignment, reorderStockReportItem, setStockReportPriority } from "../api/stock-report-api";
import { stockReportKeys } from "../api/stock-report-keys";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";

function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
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
    mutationFn: ({ stockNeedId, toIndex }: { stockNeedId: string; toIndex: number }) => reorderStockReportItem(stockNeedId, toIndex + 1),
    onMutate: async ({ stockNeedId, toIndex }) => {
      const key = stockReportKeys.list(bucket, filter);
      const previous = queryClient.getQueryData<StockReportItem[]>(key);
      const from = previous?.findIndex((row) => row.client_id === stockNeedId) ?? -1;
      if (previous && from >= 0) queryClient.setQueryData(key, move(previous, from, toIndex));
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
