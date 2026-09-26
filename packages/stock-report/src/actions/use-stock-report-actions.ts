import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type {
  StockNeedBucket,
  StockReportAssignment,
  StockReportItem,
  StockReportItemSnapshot,
  StockReportListFilter,
  StockReportPriority,
  StockReportBoardBucket,
} from "../stock-report.types";
import {
  createStockAssignment,
  createStockReportVersion,
  removeStockAssignment,
  reorderStockReportItem,
  setStockReportMissingQuantity,
  setStockReportPriority,
} from "../api/stock-report-api";
import { stockReportKeys } from "../api/stock-report-keys";
import {
  restartStockReportListQueries,
  stockReportListItems,
  updateStockReportListItems,
  type StockReportItemListData,
} from "../api/stock-report-list-cache";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";

/** The cached row with its snapshot patched, or untouched when it has none. */
function withSnapshot(
  row: StockReportItem,
  patch: Partial<StockReportItemSnapshot>,
): StockReportItem {
  return row.snapshot ? { ...row, snapshot: { ...row.snapshot, ...patch } } : row;
}

/** Patches the detail entry when the page holds one; never creates it. */
function patchDetailEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  stockNeedId: string,
  update: (row: StockReportItem) => StockReportItem,
): StockReportItem | undefined {
  const key = stockReportKeys.item(stockNeedId);
  const previous = queryClient.getQueryData<StockReportItem>(key);
  if (previous) queryClient.setQueryData<StockReportItem>(key, update(previous));
  return previous;
}

function bySnapshotOrder(a: StockReportItem, b: StockReportItem): number {
  return (
    (a.snapshot?.priority_order ?? Number.MAX_SAFE_INTEGER) -
    (b.snapshot?.priority_order ?? Number.MAX_SAFE_INTEGER)
  );
}

/**
 * The server's own move, applied to the cache.
 *
 * `PATCH .../priority-order` sets the moved snapshot's `priority_order` to
 * `target` and shifts everything it passed over by one, then the board reads
 * the group back sorted by that column. Reproducing the arithmetic rather than
 * splicing the array keeps every cached row's `priority_order` true while the
 * request is in flight — and that column is what the *next* drag's target is
 * read from, so a cache that merely looked right would hand the following drag
 * a stale position.
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
  const position = mover?.snapshot?.priority_order;
  if (position == null || position === target) return [...rows];

  return rows
    .map((row) => {
      if (row.client_id === stockNeedId) return withSnapshot(row, { priority_order: target });
      const order = row.snapshot?.priority_order;
      if (order == null) return row;
      if (target > position && order > position && order <= target) {
        return withSnapshot(row, { priority_order: order - 1 });
      }
      if (target < position && order >= target && order < position) {
        return withSnapshot(row, { priority_order: order + 1 });
      }
      return row;
    })
    .toSorted(bySnapshotOrder);
}

export function useSetStockReportPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockNeedId, priority }: { stockNeedId: string; priority: StockReportPriority | null }) => setStockReportPriority(stockNeedId, priority),
    onMutate: async ({ stockNeedId, priority }) => {
      const previous = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() });
      const source = previous.flatMap(([, data]) => stockReportListItems(data)).find((row) => row.client_id === stockNeedId);
      const destination: StockNeedBucket = priority ?? "unset";
      // The move leaves every list that is not the destination — and an `all`
      // list, which holds every bucket, keeps the row in place.
      for (const [key, data] of previous) {
        if (stockReportKeys.bucketOfListKey(key) === "all") {
          queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => rows.map((row) => row.client_id === stockNeedId ? withSnapshot(row, { priority, priority_order: null }) : row)));
          continue;
        }
        queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => rows.filter((row) => row.client_id !== stockNeedId)));
      }
      if (source) {
        // The server appends a moved row to the end of its new group; its real
        // position arrives with the refetch. Every cached list of the
        // destination bucket, whatever its category filter, gains it — the
        // settle-time invalidation refetches the active one anyway.
        const moved = withSnapshot(source, { priority, priority_order: null });
        for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.bucketLists(destination) })) {
          if (stockReportKeys.isMissingListKey(key) && !(moved.snapshot && moved.snapshot.quantity_missing > 0)) continue;
          queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => [...rows.filter((row) => row.client_id !== stockNeedId), moved]));
        }
      }
      const previousDetail = patchDetailEntry(queryClient, stockNeedId, (row) => withSnapshot(row, { priority, priority_order: null }));
      return { previous, previousDetail };
    },
    // The rollback alone would snap the card back with no explanation (W-3).
    onError: (error, { stockNeedId }, context) => {
      context?.previous.forEach(([key, rows]) => queryClient.setQueryData(key, rows));
      if (context?.previousDetail) queryClient.setQueryData(stockReportKeys.item(stockNeedId), context.previousDetail);
      notify.error("Priority not changed", stockReportRequestFailureMessage(error));
    },
    onSuccess: (row) => patchDetailEntry(queryClient, row.client_id, () => row),
    onSettled: () => restartStockReportListQueries(queryClient),
  });
}

export function useReorderStockReportItem(bucket: StockReportBoardBucket, filter: StockReportListFilter) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockNeedId, targetOrder }: { stockNeedId: string; targetOrder: number }) => reorderStockReportItem(stockNeedId, targetOrder),
    onMutate: async ({ stockNeedId, targetOrder }) => {
      const key = stockReportKeys.list(bucket, filter);
      const previous = queryClient.getQueryData<StockReportItemListData>(key);
      if (previous) queryClient.setQueryData(key, updateStockReportListItems(previous, (rows) => applyPriorityOrderMove(rows, stockNeedId, targetOrder)));
      return { key, previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(context?.key ?? stockReportKeys.list(bucket, filter), context?.previous);
      notify.error("Order not changed", stockReportRequestFailureMessage(error));
    },
    onSettled: () => restartStockReportListQueries(queryClient, stockReportKeys.list(bucket, filter)),
  });
}

/**
 * The detail page's Mark / Unmark missing switch (§5.7). The value is absolute:
 * the caller sends the ceiling to mark everything uncovered, or 0 to clear it.
 *
 * Optimistic on every cached list and on the detail entry, because the bar on
 * the card and on the detail summary both read `snapshot.quantity_missing`. A
 * missing-mode list only holds rows with something missing, so clearing to 0
 * drops the row from those lists at once — the detail entry is what keeps the
 * open page reactive after that. A row *entering* the missing lists waits for
 * the settle-time refetch (it is not in the cache to patch).
 */
export function useSetStockReportMissingQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockNeedId, quantityMissing }: { stockNeedId: string; quantityMissing: number }) => setStockReportMissingQuantity(stockNeedId, quantityMissing),
    onMutate: async ({ stockNeedId, quantityMissing }) => {
      const previous = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() });
      for (const [key, data] of previous) {
        const rows = stockReportListItems(data);
        if (!rows?.some((row) => row.client_id === stockNeedId)) continue;
        queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (items) => items
          .filter((row) => !(row.client_id === stockNeedId && quantityMissing === 0 && stockReportKeys.isMissingListKey(key)))
          .map((row) => row.client_id === stockNeedId ? withSnapshot(row, { quantity_missing: quantityMissing }) : row)));
      }
      const previousDetail = patchDetailEntry(queryClient, stockNeedId, (row) => withSnapshot(row, { quantity_missing: quantityMissing }));
      return { previous, previousDetail };
    },
    onError: (error, { stockNeedId }, context) => {
      context?.previous.forEach(([key, rows]) => queryClient.setQueryData(key, rows));
      if (context?.previousDetail) queryClient.setQueryData(stockReportKeys.item(stockNeedId), context.previousDetail);
      notify.error("Missing quantity not changed", stockReportRequestFailureMessage(error));
    },
    // The response row is authoritative (the backend may have clamped); seed
    // it wherever the row is cached.
    onSuccess: (row) => {
      for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() })) {
        const rows = stockReportListItems(data);
        if (!rows?.some((cached) => cached.client_id === row.client_id)) continue;
        queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (items) => items.map((cached) => cached.client_id === row.client_id ? row : cached)));
      }
      patchDetailEntry(queryClient, row.client_id, () => row);
    },
    onSettled: () => {
      restartStockReportListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: stockReportKeys.missingSummary(), refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
    },
  });
}

/**
 * Opens a new version (§5.8). Nothing optimistic: the backend freezes every
 * row and resets every priority in one transaction, which the client cannot
 * model. On success the cached board is **removed**, not invalidated — the
 * board is never on screen while the hub creates a version, and a stale cache
 * would flash the previous version's priorities before the refetch replaced
 * them. The failure surface is the caller's overlay, so no toast here.
 */
export function useCreateStockReportVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockReportVersion,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: stockReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: stockReportKeys.versionList(), refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: stockReportKeys.missingSummary(), refetchType: "active" });
    },
  });
}

export function useCreateStockAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockAssignment,
    onSuccess: (assignment) => {
      queryClient.setQueryData(stockReportKeys.assignmentList(assignment.stock_report_item_id), (rows: unknown[] | undefined) => [...(rows ?? []), assignment]);
      restartStockReportListQueries(queryClient);
    },
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
    onSuccess: () => restartStockReportListQueries(queryClient),
    onSettled: () => queryClient.invalidateQueries({ queryKey: stockReportKeys.assignmentList(stockNeedId), refetchType: "active" }),
  });
}
