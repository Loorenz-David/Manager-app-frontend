import type { SocketEventHandlers } from "@beyo/realtime";
import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { STOCK_REPORT_FILTER_ALL, stockReportKeys } from "./api/stock-report-keys";
import {
  cachedStockReportDraftScopes,
  dropStockReportVersionQueries,
  restartStockReportListQueries,
  stockReportListItems,
  updateStockReportListItems,
  type StockReportItemListData,
} from "./api/stock-report-list-cache";
import {
  STOCK_REPORT_ACTIVE_SCOPE,
  type StockReportItem,
  type StockReportItemSnapshot,
  type StockReportSnapshotVersion,
  type StockReportVersionScope,
} from "./stock-report.types";

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
// Every key is present on every emission, `null` where there is no value
// (v10 §7): `quantity_missing` is the *stored* value, `null` on a draft row
// that borrows the board's count (v9 §7).
const SnapshotUpdatedSchema = ItemIdSchema.extend({
  stock_report_item_id: z.string(),
  version_id: z.string(),
  priority: z.string().nullable(),
  priority_order: z.number().nullable(),
  quantity_requested_scanner: z.number().nullable(),
  quantity_requested_manual: z.number().nullable(),
  quantity_missing: z.number().nullable(),
  quantity_resolved: z.number().nullable(),
});
const VersionCreatedSchema = ItemIdSchema.extend({ state: z.string().optional() });
const AssignmentEventSchema = ItemIdSchema.extend({ stock_report_item_id: z.string(), task_id: z.string(), state: z.string() });

type Handler<E extends keyof SocketEventHandlers> = NonNullable<SocketEventHandlers[E]>;
type Context = Parameters<Handler<"stock_report_item:updated">>[1];
type SnapshotPayload = z.infer<typeof SnapshotUpdatedSchema>;

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

/** The scope of a detail entry's key — the segment after the row id (`item(id, scope)`). */
function scopeOfDetailKey(key: readonly unknown[]): StockReportVersionScope | undefined {
  return key[stockReportKeys.items().length + 1] as StockReportVersionScope | undefined;
}

/**
 * The open detail pages' own entries of one row — one per scope, patched when
 * they exist and never created. `scopes` limits the patch to some of them.
 */
function patchDetailEntries(
  queryClient: QueryClient,
  stockNeedId: string,
  update: (row: StockReportItem, scope: StockReportVersionScope) => StockReportItem,
  admits: (scope: StockReportVersionScope) => boolean = () => true,
): void {
  for (const [key, current] of queryClient.getQueriesData<StockReportItem>({ queryKey: stockReportKeys.itemAll(stockNeedId) })) {
    const scope = scopeOfDetailKey(key);
    if (!current || scope === undefined || !admits(scope)) continue;
    queryClient.setQueryData<StockReportItem>(key, update(current, scope));
  }
}

/**
 * The active version's id, as the cache knows it (projection R9): any
 * active-scope row carries it in `snapshot.version_id` (v7 §6.6), which is
 * what workers' and sellers' boards have — they never load the active
 * version itself. The cached active version is the fallback for an empty
 * board; `null` when neither is there.
 */
function knownActiveVersionId(
  queryClient: QueryClient,
  lists: readonly [readonly unknown[], StockReportItemListData | undefined][],
): string | null {
  for (const [key, data] of lists) {
    if (stockReportKeys.versionScopeOfListKey(key) !== STOCK_REPORT_ACTIVE_SCOPE) continue;
    const versionId = stockReportListItems(data).find((row) => row.snapshot)?.snapshot?.version_id;
    if (versionId) return versionId;
  }
  for (const [key, row] of queryClient.getQueriesData<StockReportItem>({ queryKey: stockReportKeys.items() })) {
    if (scopeOfDetailKey(key) === STOCK_REPORT_ACTIVE_SCOPE && row?.snapshot) return row.snapshot.version_id;
  }
  for (const [, version] of queryClient.getQueriesData<StockReportSnapshotVersion | null>({ queryKey: stockReportKeys.activeVersion() })) {
    if (version) return version.client_id;
  }
  return null;
}

/**
 * The snapshot's `quantity_awaiting` is the row's live awaiting plus the units
 * Scanner already resolved (§6.6). Both events that touch it — the row's
 * counters and the snapshot's `quantity_resolved` — recompute it from the two
 * cached halves, so they converge on the same value in either order.
 *
 * A draft's snapshot is live (v8 §0.1 item 9): Scanner's new requested value
 * moves into `quantity_requested_scanner`, and into `quantity_requested` while
 * Scanner's value is the one in force. An active snapshot keeps its frozen
 * values.
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
  const isDraft = row.snapshot.active_at === null;
  const scanner = isDraft ? patched.quantity_requested : row.snapshot.quantity_requested_scanner;
  return {
    ...patched,
    snapshot: {
      ...row.snapshot,
      quantity_in_queue: patched.quantity_in_queue,
      quantity_in_progress: patched.quantity_in_progress,
      quantity_awaiting: patched.quantity_awaiting + row.snapshot.quantity_resolved,
      quantity_requested_scanner: scanner,
      quantity_requested:
        isDraft && row.snapshot.quantity_requested_source === "scanner" ? scanner : row.snapshot.quantity_requested,
    },
  };
}

/**
 * The snapshot event applied to its own version's row. The requested value in
 * force follows v8's one rule (§0.1 item 8): the manual value, else Scanner's,
 * else the row's. The missing count on a draft follows v9 §0.1 item 10: a
 * number is the draft's own, `null` borrows the board's (`active_quantity_missing`,
 * else 0). On the active version the count is always the row's own, and the
 * board's copy of it is the same number (v8 §6.6).
 */
function withSnapshotPatch(row: StockReportItem, payload: SnapshotPayload, scope: StockReportVersionScope): StockReportItem {
  if (!row.snapshot) return row;
  const resolved = payload.quantity_resolved ?? row.snapshot.quantity_resolved;
  const scanner = payload.quantity_requested_scanner ?? row.quantity_requested;
  const isActive = scope === STOCK_REPORT_ACTIVE_SCOPE;
  const missing = isActive
    ? { quantity_missing: payload.quantity_missing ?? row.snapshot.quantity_missing, quantity_missing_source: "own" as const }
    : payload.quantity_missing !== null
      ? { quantity_missing: payload.quantity_missing, quantity_missing_source: "own" as const }
      : {
          quantity_missing: row.snapshot.active_quantity_missing ?? 0,
          quantity_missing_source: row.snapshot.active_quantity_missing === null ? ("none" as const) : ("active" as const),
        };
  const snapshot: StockReportItemSnapshot = {
    ...row.snapshot,
    priority: payload.priority,
    priority_order: payload.priority_order,
    quantity_requested: payload.quantity_requested_manual ?? scanner,
    quantity_requested_scanner: scanner,
    quantity_requested_source: payload.quantity_requested_manual !== null ? "manual" : "scanner",
    ...missing,
    active_quantity_missing: isActive ? missing.quantity_missing : row.snapshot.active_quantity_missing,
    quantity_resolved: resolved,
    quantity_awaiting: row.quantity_awaiting + resolved,
  };
  return { ...row, snapshot };
}

/**
 * v9 §0.1 item 12 — the active version's missing count reached a draft's row.
 * The board's copy is refreshed on every draft row (projection R10, the "board
 * says N" line); a row that borrows follows it, a row with its own number
 * keeps that number.
 */
function withBorrowedMissing(row: StockReportItem, activeMissing: number): StockReportItem {
  if (!row.snapshot) return row;
  const borrows = row.snapshot.quantity_missing_source !== "own";
  return {
    ...row,
    snapshot: {
      ...row.snapshot,
      active_quantity_missing: activeMissing,
      ...(borrows ? { quantity_missing: activeMissing, quantity_missing_source: "active" as const } : {}),
    },
  };
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
 * A snapshot changed its priority, order, requested, missing or resolved
 * count. Only the lists of **its version's scope** are patched (plan §3.2): the
 * row is patched where it sits; when its bucket changed it leaves every list
 * that no longer admits it and joins every cached list that does (the
 * destination bucket and `all`, matching category filter, missing lists only
 * while something is missing). The scope's lists are then restarted for the
 * true order — that scope only (projection R8), so a draft edit never refetches
 * the boards on the floor.
 *
 * An active-scope list's version is its own rows' (R9); when no row and no
 * cached active version can say, the board is restarted instead of touched.
 * When the event *is* the active version's, every draft-scope row of the same
 * stock need takes the new board count (v9 §0.1 item 12) and the draft scopes
 * are restarted too — a missing-mode draft list may change membership, since
 * its filter reads the effective count (v10 §5.1).
 *
 * Returns whether the event was the active version's — or might be, when the
 * board's version is unknown — for the invalidations.
 */
function applySnapshotUpdate(queryClient: QueryClient, payload: SnapshotPayload): { touchesActive: boolean } {
  const destination = bucket(payload.priority);
  const lists = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() });
  const activeId = knownActiveVersionId(queryClient, lists);
  const isActiveEvent = activeId !== null && payload.version_id === activeId;
  const eventScope: StockReportVersionScope = isActiveEvent ? STOCK_REPORT_ACTIVE_SCOPE : payload.version_id;
  const restarts = new Set<StockReportVersionScope>([eventScope]);

  const scoped = lists.filter(([key]) => stockReportKeys.versionScopeOfListKey(key) === eventScope);
  const existing = scoped.flatMap(([, data]) => stockReportListItems(data)).find((row) => row.client_id === payload.stock_report_item_id);
  if (existing) {
    const patched = withSnapshotPatch(existing, payload, eventScope);
    for (const [key, data] of scoped) {
      const rows = stockReportListItems(data);
      const holds = rows.some((row) => row.client_id === patched.client_id);
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
  // Not in any list of the scope: the open detail page may still hold it, and
  // a missing-mode list may now want it — the scope's restart covers that.
  patchDetailEntries(queryClient, payload.stock_report_item_id, (row, scope) => withSnapshotPatch(row, payload, scope), (scope) => scope === eventScope);

  if (activeId === null) {
    // The board's version is unknown: its lists cannot be told apart from the
    // event's, and neither can the drafts' borrowed counts. Restart what is
    // cached rather than guess.
    restarts.add(STOCK_REPORT_ACTIVE_SCOPE);
    if (!scoped.length) {
      restartStockReportListQueries(queryClient);
      return { touchesActive: true };
    }
  }

  if (isActiveEvent && payload.quantity_missing !== null) {
    const activeMissing = payload.quantity_missing;
    for (const [key, data] of lists) {
      const scope = stockReportKeys.versionScopeOfListKey(key);
      if (scope === undefined || scope === STOCK_REPORT_ACTIVE_SCOPE) continue;
      restarts.add(scope);
      if (stockReportKeys.isMissingListKey(key)) continue;
      if (!stockReportListItems(data).some((row) => row.client_id === payload.stock_report_item_id)) continue;
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (list) => list.map((row) => row.client_id === payload.stock_report_item_id ? withBorrowedMissing(row, activeMissing) : row)));
    }
    patchDetailEntries(queryClient, payload.stock_report_item_id, (row) => withBorrowedMissing(row, activeMissing), (scope) => scope !== STOCK_REPORT_ACTIVE_SCOPE);
  }

  for (const scope of restarts) restartStockReportListQueries(queryClient, stockReportKeys.versionLists(scope));
  return { touchesActive: isActiveEvent || activeId === null };
}

export const stockReportSocketEvents: SocketEventHandlers = {
  // v8 §5.4: a new Scanner row belongs to every version, so every scope
  // refetches; each draft's `snapshot_count` rose (v10 §5.4). Never the
  // `versions()` prefix — the draft count moves on version events only
  // (v10 §5.23, projection R17).
  "stock_report_item:created": (_payload, { queryClient }) => {
    restartStockReportListQueries(queryClient);
    invalidate(queryClient, stockReportKeys.versionList());
  },
  // A row event concerns the live row, which every open version shows (plan
  // §3.2): applied to every scope, then every scope restarted.
  "stock_report_item:updated": (payload, { queryClient }) => {
    const parsed = ItemUpdatedSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion()); return; }
    for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() })) {
      const rows = stockReportListItems(data);
      if (!rows.some((row) => row.client_id === parsed.data.client_id)) continue;
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (items) => items.map((row) => row.client_id === parsed.data.client_id ? withRowCounters(row, parsed.data) : row)));
    }
    patchDetailEntries(queryClient, parsed.data.client_id, (row) => withRowCounters(row, parsed.data));
    restartStockReportListQueries(queryClient);
    // Every version's progress sums these counters — the leaves, not the prefix (R17).
    invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion());
  },
  "stock_report_item_snapshot:updated": (payload, { queryClient }) => {
    const parsed = SnapshotUpdatedSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); invalidate(queryClient, stockReportKeys.missingSummary(), stockReportKeys.activeVersion(), stockReportKeys.versionList()); return; }
    const { touchesActive } = applySnapshotUpdate(queryClient, parsed.data);
    // A draft's progress follows its effective missing (v9 §6.8), so its own
    // read and the list refetch on every event; the summary and the active
    // read only when the event is (or may be) the active version's.
    invalidate(queryClient, stockReportKeys.version(parsed.data.version_id), stockReportKeys.versionList());
    if (touchesActive) invalidate(queryClient, stockReportKeys.missingSummary(), stockReportKeys.activeVersion());
  },
  "stock_report_item:deleted": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    if (!parsed.success) { restartStockReportListQueries(queryClient); return; }
    for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.lists() })) {
      queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => rows.filter((row) => row.client_id !== parsed.data.client_id)));
    }
    restartStockReportListQueries(queryClient);
    // Every scope's entry of the row (projection R5).
    queryClient.removeQueries({ queryKey: stockReportKeys.itemAll(parsed.data.client_id) });
    // The detail page has no read endpoint of its own; its only exit is the
    // assignments query 404-ing. Refetch it so an open page closes instead of
    // hanging on "Loading" (wiring guide W-2). Each draft's `snapshot_count`
    // fell (v7 §5.4).
    invalidate(queryClient, stockReportKeys.assignmentList(parsed.data.client_id), stockReportKeys.activeVersion(), stockReportKeys.missingSummary(), stockReportKeys.versionList());
  },
  // §5.8: a new active version means every row's snapshot is new and every
  // priority is null again — refetch the board rather than patch it. A new
  // draft (v8 §7) touches nothing on the board: only the drafts list and the
  // hub's count.
  "stock_report_snapshot_version:created": (payload, { queryClient }) => {
    const parsed = VersionCreatedSchema.safeParse(payload);
    if (parsed.success && parsed.data.state === "draft") {
      invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.draftCount());
      return;
    }
    restartStockReportListQueries(queryClient);
    invalidate(queryClient, stockReportKeys.activeVersion(), stockReportKeys.versionList(), stockReportKeys.missingSummary());
  },
  "stock_report_snapshot_version:closed": (_payload, { queryClient }) => {
    invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion());
  },
  // v8 §7, v9 §7: a draft became the live version. Activation emits no per-row
  // events, and after it every remaining draft borrows from the *new* active
  // version (v10 §7): the closed board's lists are dropped and every draft
  // scope restarted. The activated draft's own page closes itself (§C.4).
  "stock_report_snapshot_version:activated": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    dropStockReportVersionQueries(queryClient, STOCK_REPORT_ACTIVE_SCOPE);
    for (const scope of cachedStockReportDraftScopes(queryClient)) restartStockReportListQueries(queryClient, stockReportKeys.versionLists(scope));
    invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion(), stockReportKeys.draftCount(), stockReportKeys.missingSummary());
    if (parsed.success) invalidate(queryClient, stockReportKeys.version(parsed.data.client_id));
  },
  // v8 §7: the live version took today's Scanner quantities; each changed row
  // also emitted its own snapshot event. The board and — the drafts borrow
  // nothing from requested, but their own refresh is cheap and the version
  // reads changed — the refreshed version's scope restart from page zero.
  "stock_report_snapshot_version:refreshed": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    restartStockReportListQueries(queryClient, stockReportKeys.versionLists(STOCK_REPORT_ACTIVE_SCOPE));
    if (parsed.success) restartStockReportListQueries(queryClient, stockReportKeys.versionLists(parsed.data.client_id));
    invalidate(queryClient, stockReportKeys.versions(), stockReportKeys.missingSummary());
  },
  // v8 §7, v9 §7: a title or schedule changed — also how a superseded or
  // same-minute-skipped schedule (v8 §5.21, v9 §5.21) reaches the UI.
  "stock_report_snapshot_version:updated": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    invalidate(queryClient, stockReportKeys.versionList());
    if (parsed.success) invalidate(queryClient, stockReportKeys.version(parsed.data.client_id));
  },
  "stock_report_snapshot_version:deleted": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    if (parsed.success) dropStockReportVersionQueries(queryClient, parsed.data.client_id);
    invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.draftCount());
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
