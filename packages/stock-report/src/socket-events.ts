import type { SocketEventHandlers } from "@beyo/realtime";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { STOCK_REPORT_FILTER_ALL, stockReportKeys } from "./api/stock-report-keys";
import {
  restartStockReportListQueries,
  stockReportListItems,
  updateStockReportListItems,
  type StockReportItemListData,
} from "./api/stock-report-list-cache";
import type { StockReportItem, StockReportItemSnapshot } from "./stock-report.types";

const ItemIdSchema = z.object({ client_id: z.string() });
// §7: the row's four live counters and nothing else — the priority keys moved
// to the snapshot event.
const ItemUpdatedSchema = ItemIdSchema.extend({
  quantity_requested: z.number().nullable(),
  quantity_in_queue: z.number().nullable(),
  quantity_in_progress: z.number().nullable(),
  quantity_awaiting: z.number().nullable(),
});
// `client_id` is the **snapshot's** id; `stock_report_item_id` names the row.
const SnapshotUpdatedSchema = ItemIdSchema.extend({
  stock_report_item_id: z.string(),
  version_id: z.string().nullable().optional(),
  priority: z.string().nullable(),
  priority_order: z.number().nullable(),
  quantity_missing: z.number().nullable(),
  quantity_resolved: z.number().nullable(),
});
const AssignmentEventSchema = ItemIdSchema.extend({ stock_report_item_id: z.string(), task_id: z.string(), state: z.string() });

type Handler<E extends keyof SocketEventHandlers> = NonNullable<SocketEventHandlers[E]>;
type Context = Parameters<Handler<"stock_report_item:updated">>[1];

function bucket(priority: string | null | undefined): "unset" | "high" | "medium" | "low" | null {
  return priority === null || priority === undefined ? "unset" : priority === "high" || priority === "medium" || priority === "low" ? priority : null;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * The server's board order (§5.1): priority groups high → medium → low, then
 * `priority_order`, then the unprioritised by creation. A single-bucket list
 * only ever exercises the middle term; an `all` list needs all three.
 */
function byBoardOrder(a: StockReportItem, b: StockReportItem): number {
  const rank = (row: StockReportItem) => PRIORITY_RANK[row.snapshot?.priority ?? ""] ?? 3;
  return (
    rank(a) - rank(b) ||
    (a.snapshot?.priority_order ?? Number.MAX_SAFE_INTEGER) - (b.snapshot?.priority_order ?? Number.MAX_SAFE_INTEGER) ||
    a.created_at.localeCompare(b.created_at)
  );
}

function invalidate(queryClient: QueryClient, ...keys: readonly (readonly unknown[])[]): void {
  for (const queryKey of keys) queryClient.invalidateQueries({ queryKey, refetchType: "active" });
}

/** The open detail page's own entry, patched when it exists and never created. */
function patchDetailEntry(queryClient: QueryClient, stockNeedId: string, update: (row: StockReportItem) => StockReportItem): void {
  const key = stockReportKeys.item(stockNeedId);
  const current = queryClient.getQueryData<StockReportItem>(key);
  if (current) queryClient.setQueryData<StockReportItem>(key, update(current));
}

/**
 * The snapshot's `quantity_awaiting` is the row's live awaiting plus the units
 * Scanner already resolved (§6.6). Both events that touch it — the row's
 * counters and the snapshot's `quantity_resolved` — recompute it from the two
 * cached halves, so they converge on the same value in either order.
 */
function withRowCounters(row: StockReportItem, payload: z.infer<typeof ItemUpdatedSchema>): StockReportItem {
  const patched: StockReportItem = {
    ...row,
    quantity_requested: payload.quantity_requested ?? row.quantity_requested,
    quantity_in_queue: payload.quantity_in_queue ?? row.quantity_in_queue,
    quantity_in_progress: payload.quantity_in_progress ?? row.quantity_in_progress,
    quantity_awaiting: payload.quantity_awaiting ?? row.quantity_awaiting,
  };
  if (!row.snapshot) return patched;
  return {
    ...patched,
    snapshot: {
      ...row.snapshot,
      quantity_in_queue: patched.quantity_in_queue,
      quantity_in_progress: patched.quantity_in_progress,
      quantity_awaiting: patched.quantity_awaiting + row.snapshot.quantity_resolved,
    },
  };
}

function withSnapshotPatch(row: StockReportItem, payload: z.infer<typeof SnapshotUpdatedSchema>): StockReportItem {
  if (!row.snapshot) return row;
  const resolved = payload.quantity_resolved ?? row.snapshot.quantity_resolved;
  const snapshot: StockReportItemSnapshot = {
    ...row.snapshot,
    priority: payload.priority,
    priority_order: payload.priority_order,
    quantity_missing: payload.quantity_missing ?? row.snapshot.quantity_missing,
    quantity_resolved: resolved,
    quantity_awaiting: row.quantity_awaiting + resolved,
  };
  return { ...row, snapshot };
}

/** Whether a list keyed `key` should hold `row` after the change. */
function listAdmits(key: readonly unknown[], row: StockReportItem, destination: Exclude<ReturnType<typeof bucket>, null>): boolean {
  const listBucket = stockReportKeys.bucketOfListKey(key);
  if (listBucket !== destination && listBucket !== "all") return false;
  const keyFilter = stockReportKeys.filterOfListKey(key);
  if (keyFilter !== STOCK_REPORT_FILTER_ALL && keyFilter !== row.item_category.major_category) return false;
  if (stockReportKeys.isMissingListKey(key) && !(row.snapshot && row.snapshot.quantity_missing > 0)) return false;
  return true;
}

/**
 * A snapshot changed its priority, order, missing or resolved count. The row
 * is patched where it sits; when its bucket changed it leaves every list that
 * no longer admits it and joins every cached list that does (the destination
 * bucket and `all`, matching category filter, missing lists only while
 * something is missing). Destination lists are refetched for the true order.
 */
function applySnapshotUpdate(queryClient: QueryClient, payload: z.infer<typeof SnapshotUpdatedSchema>): void {
  const destination = bucket(payload.priority);
  const lists = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() });
  const existing = lists.flatMap(([, data]) => stockReportListItems(data)).find((row) => row.client_id === payload.stock_report_item_id);
  if (!existing) {
    // Not in any list: the open detail page may still hold it, and a
    // missing-mode list may now want it. The caller restarts every list after
    // this optimistic detail patch.
    patchDetailEntry(queryClient, payload.stock_report_item_id, (row) => withSnapshotPatch(row, payload));
    return;
  }
  const patched = withSnapshotPatch(existing, payload);
  patchDetailEntry(queryClient, patched.client_id, (row) => withSnapshotPatch(row, payload));
  for (const [key, data] of lists) {
    const rows = stockReportListItems(data);
    const holds = rows?.some((row) => row.client_id === patched.client_id) ?? false;
    const admits = destination !== null && listAdmits(key, patched, destination);
    if (holds && admits) {
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (list) => list.map((row) => row.client_id === patched.client_id ? patched : row).toSorted(byBoardOrder)));
    } else if (holds) {
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (list) => list.filter((row) => row.client_id !== patched.client_id)));
    } else if (admits) {
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (list) => [...list, patched]));
    }
  }
}

export const stockReportSocketEvents: SocketEventHandlers = {
  "stock_report_item:created": (_payload, { queryClient }) => {
    restartStockReportListQueries(queryClient);
  },
  "stock_report_item:updated": (payload, { queryClient }) => {
    const parsed = ItemUpdatedSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); invalidate(queryClient, stockReportKeys.activeVersion()); return; }
    for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() })) {
      const rows = stockReportListItems(data);
      if (!rows?.some((row) => row.client_id === parsed.data.client_id)) continue;
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (items) => items.map((row) => row.client_id === parsed.data.client_id ? withRowCounters(row, parsed.data) : row)));
    }
    patchDetailEntry(queryClient, parsed.data.client_id, (row) => withRowCounters(row, parsed.data));
    restartStockReportListQueries(queryClient);
    // The version's progress sums these counters.
    invalidate(queryClient, stockReportKeys.activeVersion());
  },
  "stock_report_item_snapshot:updated": (payload, { queryClient }) => {
    const parsed = SnapshotUpdatedSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); invalidate(queryClient, stockReportKeys.missingSummary(), stockReportKeys.activeVersion()); return; }
    applySnapshotUpdate(queryClient, parsed.data);
    restartStockReportListQueries(queryClient);
    invalidate(queryClient, stockReportKeys.missingSummary(), stockReportKeys.activeVersion());
  },
  "stock_report_item:deleted": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); return; }
    for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() })) {
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => rows.filter((row) => row.client_id !== parsed.data.client_id)));
    }
    restartStockReportListQueries(queryClient);
    queryClient.removeQueries({ queryKey: stockReportKeys.item(parsed.data.client_id) });
    // The detail page has no read endpoint of its own; its only exit is the
    // assignments query 404-ing. Refetch it so an open page closes instead of
    // hanging on "Loading" (wiring guide W-2).
    invalidate(queryClient, stockReportKeys.assignmentList(parsed.data.client_id), stockReportKeys.activeVersion(), stockReportKeys.missingSummary());
  },
  // §5.8: every row's snapshot is new and every priority is null again —
  // refetch the board rather than patch it.
  "stock_report_snapshot_version:created": (_payload, { queryClient }) => {
    restartStockReportListQueries(queryClient);
    invalidate(queryClient, stockReportKeys.activeVersion(), stockReportKeys.versionList(), stockReportKeys.missingSummary());
  },
  "stock_report_snapshot_version:closed": (_payload, { queryClient }) => {
    invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion());
  },
  "stock_task_assignment:created": assignmentInvalidator,
  "stock_task_assignment:state-changed": assignmentInvalidator,
  "stock_task_assignment:deleted": assignmentInvalidator,
};

function assignmentInvalidator(payload: unknown, { queryClient }: Context): void {
  const parsed = AssignmentEventSchema.safeParse(payload);
  // An assignment move changes the version's in-flight and completed sums.
  restartStockReportListQueries(queryClient);
  invalidate(queryClient, stockReportKeys.activeVersion());
  if (!parsed.success) { invalidate(queryClient, stockReportKeys.assignments()); return; }
  invalidate(queryClient, stockReportKeys.assignmentList(parsed.data.stock_report_item_id));
}
