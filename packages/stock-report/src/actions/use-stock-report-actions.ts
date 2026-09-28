import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import {
  STOCK_REPORT_ACTIVE_SCOPE,
  stockReportVersionScope,
  type StockNeedBucket,
  type StockReportAssignment,
  type StockReportItem,
  type StockReportItemSnapshot,
  type StockReportListFilter,
  type StockReportPriority,
  type StockReportBoardBucket,
  type StockReportSnapshotVersion,
  type StockReportSnapshotVersionRow,
  type StockReportVersionScope,
} from "../stock-report.types";
import {
  activateStockReportVersion,
  createStockAssignment,
  createStockReportVersion,
  deleteStockReportVersion,
  refreshStockReportVersionRequested,
  removeStockAssignment,
  reorderStockReportItem,
  setStockReportMissingQuantity,
  setStockReportPriority,
  setStockReportRequestedQuantity,
  updateStockReportVersion,
  type CreateStockReportVersionInput,
  type UpdateStockReportVersionInput,
} from "../api/stock-report-api";
import { stockReportKeys, stockReportMutationKeys } from "../api/stock-report-keys";
import {
  dropStockReportVersionQueries,
  restartStockReportListQueries,
  stockReportListItems,
  updateStockReportListItems,
  type StockReportItemListData,
} from "../api/stock-report-list-cache";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";

/**
 * The version scope a row edit works in (plan §3.1): `versionId` undefined is
 * the board — the shortcut routes without a version id — and an id is that
 * version's rows through the versioned routes (v7 §5.14–§5.16).
 */
export type StockReportRowEditScope = { versionId?: string };

/** The optional trailing argument of a row-edit request: absent on the board. */
function versionArg(versionId: string | undefined): [] | [string] {
  return versionId === undefined ? [] : [versionId];
}

/** The cached row with its snapshot patched, or untouched when it has none. */
function withSnapshot(
  row: StockReportItem,
  patch: Partial<StockReportItemSnapshot>,
): StockReportItem {
  return row.snapshot ? { ...row, snapshot: { ...row.snapshot, ...patch } } : row;
}

/**
 * v9 §5.16 — the missing count as the cache will show it: a number is the
 * row's own; `null` (drafts only) borrows the board's count, or 0 when the
 * board has none.
 */
function missingPatch(row: StockReportItem, quantityMissing: number | null): Partial<StockReportItemSnapshot> {
  if (quantityMissing !== null) return { quantity_missing: quantityMissing, quantity_missing_source: "own" };
  const active = row.snapshot?.active_quantity_missing ?? null;
  return { quantity_missing: active ?? 0, quantity_missing_source: active === null ? "none" : "active" };
}

/**
 * v8 §5.22 — the requested value as the cache will show it: a number is a
 * manual value, `null` returns to Scanner's. On the active version the
 * missing count is clamped at once to what the new value leaves uncovered
 * (§5.22); the server's row replaces the estimate on success.
 */
function requestedPatch(row: StockReportItem, value: number | null, scope: StockReportVersionScope): Partial<StockReportItemSnapshot> {
  if (!row.snapshot) return {};
  const requested = value ?? row.snapshot.quantity_requested_scanner;
  const patch: Partial<StockReportItemSnapshot> = {
    quantity_requested: requested,
    quantity_requested_source: value === null ? "scanner" : "manual",
  };
  if (scope !== STOCK_REPORT_ACTIVE_SCOPE) return patch;
  const covered = row.snapshot.quantity_in_queue + row.snapshot.quantity_in_progress + row.snapshot.quantity_awaiting;
  const missing = Math.max(0, Math.min(row.snapshot.quantity_missing, requested - covered));
  return { ...patch, quantity_missing: missing, active_quantity_missing: missing };
}

/** Patches the scope's detail entry when the page holds one; never creates it. */
function patchDetailEntry(
  queryClient: QueryClient,
  stockNeedId: string,
  scope: StockReportVersionScope,
  update: (row: StockReportItem) => StockReportItem,
): StockReportItem | undefined {
  const key = stockReportKeys.item(stockNeedId, scope);
  const previous = queryClient.getQueryData<StockReportItem>(key);
  if (previous) queryClient.setQueryData<StockReportItem>(key, update(previous));
  return previous;
}

/**
 * Patches one row wherever the scope's lists hold it (projection R7 — never
 * another scope's lists: a draft's row is not the board's row). A list whose
 * membership rule the patched row no longer meets drops it — a missing-mode
 * list only holds rows with something missing.
 */
function patchScopedLists(
  queryClient: QueryClient,
  scope: StockReportVersionScope,
  stockNeedId: string,
  update: (row: StockReportItem) => StockReportItem,
): void {
  for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.versionLists(scope) })) {
    const rows = stockReportListItems(data);
    if (!rows.some((row) => row.client_id === stockNeedId)) continue;
    queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (items) => items
      .map((row) => row.client_id === stockNeedId ? update(row) : row)
      .filter((row) => !(row.client_id === stockNeedId && stockReportKeys.isMissingListKey(key) && !(row.snapshot && row.snapshot.quantity_missing > 0)))));
  }
}

/** The response row is authoritative (the backend may have clamped); seed it wherever the scope caches the row. */
function seedScopedRow(queryClient: QueryClient, scope: StockReportVersionScope, row: StockReportItem): void {
  patchScopedLists(queryClient, scope, row.client_id, () => row);
  patchDetailEntry(queryClient, row.client_id, scope, () => row);
}

function restoreScope(
  queryClient: QueryClient,
  stockNeedId: string,
  scope: StockReportVersionScope,
  context: { previous: readonly [readonly unknown[], unknown][]; previousDetail: StockReportItem | undefined } | undefined,
): void {
  context?.previous.forEach(([key, rows]) => queryClient.setQueryData(key, rows));
  if (context?.previousDetail) queryClient.setQueryData(stockReportKeys.item(stockNeedId, scope), context.previousDetail);
}

/**
 * What a settled row edit refetches (plan §E.1): the scope's lists from page
 * zero, then the version reads the change moved — the board's summary and
 * active read, or the draft's own read and the list it sits in. The leaves,
 * never the `versions()` prefix (projection R17).
 */
function settleRowEdit(queryClient: QueryClient, versionId: string | undefined): void {
  const scope = stockReportVersionScope(versionId);
  restartStockReportListQueries(queryClient, stockReportKeys.versionLists(scope));
  invalidate(queryClient, ...(versionId === undefined
    ? [stockReportKeys.activeVersion(), stockReportKeys.missingSummary()]
    : [stockReportKeys.version(versionId), stockReportKeys.versionList()]));
}

function invalidate(queryClient: QueryClient, ...keys: readonly (readonly unknown[])[]): void {
  for (const queryKey of keys) queryClient.invalidateQueries({ queryKey, refetchType: "active" });
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

export function useSetStockReportPriority({ versionId }: StockReportRowEditScope = {}) {
  const queryClient = useQueryClient();
  const scope = stockReportVersionScope(versionId);
  return useMutation({
    mutationFn: ({ stockNeedId, priority }: { stockNeedId: string; priority: StockReportPriority | null }) =>
      setStockReportPriority(stockNeedId, priority, ...versionArg(versionId)),
    onMutate: async ({ stockNeedId, priority }) => {
      const previous = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.versionLists(scope) });
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
        // destination bucket in this scope, whatever its category filter,
        // gains it — the settle-time invalidation refetches the active one
        // anyway (projection R6).
        const moved = withSnapshot(source, { priority, priority_order: null });
        for (const [key, data] of queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.bucketLists(scope, destination) })) {
          if (stockReportKeys.isMissingListKey(key) && !(moved.snapshot && moved.snapshot.quantity_missing > 0)) continue;
          queryClient.setQueryData<StockReportItemListData>(key, updateStockReportListItems(data, (rows) => [...rows.filter((row) => row.client_id !== stockNeedId), moved]));
        }
      }
      const previousDetail = patchDetailEntry(queryClient, stockNeedId, scope, (row) => withSnapshot(row, { priority, priority_order: null }));
      return { previous, previousDetail };
    },
    // The rollback alone would snap the card back with no explanation (W-3).
    onError: (error, { stockNeedId }, context) => {
      restoreScope(queryClient, stockNeedId, scope, context);
      notify.error("Priority not changed", stockReportRequestFailureMessage(error));
    },
    onSuccess: (row) => patchDetailEntry(queryClient, row.client_id, scope, () => row),
    onSettled: () => settleRowEdit(queryClient, versionId),
  });
}

export function useReorderStockReportItem(bucket: StockReportBoardBucket, filter: StockReportListFilter) {
  const queryClient = useQueryClient();
  const versionId = filter.versionId ?? undefined;
  return useMutation({
    mutationFn: ({ stockNeedId, targetOrder }: { stockNeedId: string; targetOrder: number }) =>
      reorderStockReportItem(stockNeedId, targetOrder, ...versionArg(versionId)),
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
 * The detail page's Mark / Unmark / Follow-the-live-version switch (§5.7, v9
 * §5.16). The value is absolute: the ceiling marks everything uncovered, 0
 * clears it, and `null` (drafts only) drops the draft's own number so the row
 * borrows the board's count again.
 *
 * Optimistic on the scope's cached lists and on its detail entry, because the
 * bar on the card and on the detail summary both read `snapshot.quantity_missing`.
 * A missing-mode list only holds rows with something missing, so a count that
 * lands on 0 drops the row from those lists at once — the detail entry is what
 * keeps the open page reactive after that. A row *entering* the missing lists
 * waits for the settle-time refetch (it is not in the cache to patch).
 */
export function useSetStockReportMissingQuantity({ versionId }: StockReportRowEditScope = {}) {
  const queryClient = useQueryClient();
  const scope = stockReportVersionScope(versionId);
  return useMutation({
    mutationFn: ({ stockNeedId, quantityMissing }: { stockNeedId: string; quantityMissing: number | null }) =>
      setStockReportMissingQuantity(stockNeedId, quantityMissing, ...versionArg(versionId)),
    onMutate: async ({ stockNeedId, quantityMissing }) => {
      const previous = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.versionLists(scope) });
      patchScopedLists(queryClient, scope, stockNeedId, (row) => withSnapshot(row, missingPatch(row, quantityMissing)));
      const previousDetail = patchDetailEntry(queryClient, stockNeedId, scope, (row) => withSnapshot(row, missingPatch(row, quantityMissing)));
      return { previous, previousDetail };
    },
    onError: (error, { stockNeedId }, context) => {
      restoreScope(queryClient, stockNeedId, scope, context);
      notify.error("Missing quantity not changed", stockReportRequestFailureMessage(error));
    },
    onSuccess: (row) => seedScopedRow(queryClient, scope, row),
    onSettled: () => settleRowEdit(queryClient, versionId),
  });
}

/**
 * The requested-quantity sheet (v8 §5.22, v9 §5.22): a number pins the row's
 * requested value by hand, `null` returns it to Scanner's. There is no board
 * shortcut, so `versionId` is always sent — on the board it is the active
 * version's id, read from the row's own snapshot (projection R4) — while
 * `scope` names the lists the page reads: `"active"` for the board, the
 * version id for a draft.
 */
export function useSetStockReportRequestedQuantity({ versionId, scope }: { versionId: string; scope: StockReportVersionScope }) {
  const queryClient = useQueryClient();
  const scopeVersionId = scope === STOCK_REPORT_ACTIVE_SCOPE ? undefined : scope;
  return useMutation({
    mutationFn: ({ stockNeedId, value }: { stockNeedId: string; value: number | null }) =>
      setStockReportRequestedQuantity(stockNeedId, value, versionId),
    onMutate: async ({ stockNeedId, value }) => {
      const previous = queryClient.getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.versionLists(scope) });
      patchScopedLists(queryClient, scope, stockNeedId, (row) => withSnapshot(row, requestedPatch(row, value, scope)));
      const previousDetail = patchDetailEntry(queryClient, stockNeedId, scope, (row) => withSnapshot(row, requestedPatch(row, value, scope)));
      return { previous, previousDetail };
    },
    onError: (error, { stockNeedId }, context) => {
      restoreScope(queryClient, stockNeedId, scope, context);
      notify.error("Requested quantity not changed", stockReportRequestFailureMessage(error));
    },
    onSuccess: (row) => seedScopedRow(queryClient, scope, row),
    onSettled: () => {
      settleRowEdit(queryClient, scopeVersionId);
      // The board's requested change moves the active version's progress and
      // every history card's count.
      if (scopeVersionId === undefined) invalidate(queryClient, stockReportKeys.versionList());
    },
  });
}

/**
 * Opens a new version or makes a draft (§5.8, v8 §5.8). Nothing optimistic:
 * the backend freezes every row and resets every priority in one transaction,
 * which the client cannot model. On an active create the cached board is
 * **removed**, not invalidated — the board is never on screen while the hub
 * creates a version, and a stale cache would flash the previous version's
 * priorities before the refetch replaced them. A draft touches nothing on the
 * board: only the drafts list and the hub's count. The failure surface is the
 * caller's (overlay or form), so no toast here.
 */
export function useCreateStockReportVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: CreateStockReportVersionInput) => createStockReportVersion(input),
    onSuccess: (_row, input) => {
      if (input?.draft) {
        invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.draftCount());
        return;
      }
      queryClient.removeQueries({ queryKey: stockReportKeys.lists() });
      invalidate(queryClient, stockReportKeys.activeVersion(), stockReportKeys.versionList(), stockReportKeys.missingSummary());
    },
  });
}

/** Merges a command's response row into every cached read of that version, keeping the read's `progress`. */
function mergeVersionRow(queryClient: QueryClient, row: StockReportSnapshotVersionRow): void {
  for (const [key, cached] of queryClient.getQueriesData<StockReportSnapshotVersion>({ queryKey: stockReportKeys.version(row.client_id) })) {
    if (cached) queryClient.setQueryData<StockReportSnapshotVersion>(key, { ...cached, ...row });
  }
}

/**
 * v8 §5.19 — title and schedule. No optimistic write: the response row is
 * merged into the version's cached reads and the lists refetch. The active
 * version can be retitled too, so its read refetches as well.
 */
export function useUpdateStockReportVersion(versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: stockReportMutationKeys.versionCommand(versionId),
    mutationFn: (input: UpdateStockReportVersionInput) => updateStockReportVersion(versionId, input),
    onSuccess: (row) => {
      mergeVersionRow(queryClient, row);
      invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion());
    },
    onError: (error) => notify.error("Version not saved", stockReportRequestFailureMessage(error)),
  });
}

/**
 * v9 §5.17 — the draft takes the live version's place. The body is exactly
 * `{ keep_active_missing }`. Both scopes' lists are dropped (projection R11):
 * the closed board's, and the draft's own — its page closes itself (§C.4).
 */
export function useActivateStockReportVersion(versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: stockReportMutationKeys.versionCommand(versionId),
    mutationFn: ({ keepActiveMissing }: { keepActiveMissing: boolean }) => activateStockReportVersion(versionId, { keepActiveMissing }),
    onSuccess: () => {
      dropStockReportVersionQueries(queryClient, STOCK_REPORT_ACTIVE_SCOPE);
      dropStockReportVersionQueries(queryClient, versionId);
      invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.activeVersion(), stockReportKeys.version(versionId), stockReportKeys.draftCount(), stockReportKeys.missingSummary());
      notify.success("Version is live");
    },
    onError: (error) => notify.error("Activation failed", stockReportRequestFailureMessage(error)),
  });
}

/**
 * v8 §5.18 — the live version takes today's Scanner quantities. The board
 * and the version's scope restart from page zero; every version read moves
 * (the progress sums requested), so the `versions()` prefix is the target here.
 */
export function useRefreshStockReportVersionRequested(versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: stockReportMutationKeys.versionCommand(versionId),
    mutationFn: ({ keepManualRequested }: { keepManualRequested: boolean }) => refreshStockReportVersionRequested(versionId, { keepManualRequested }),
    onSuccess: ({ changed, added }) => {
      restartStockReportListQueries(queryClient, stockReportKeys.versionLists(STOCK_REPORT_ACTIVE_SCOPE));
      restartStockReportListQueries(queryClient, stockReportKeys.versionLists(versionId));
      invalidate(queryClient, stockReportKeys.versions(), stockReportKeys.missingSummary());
      notify.success("Refreshed from Scanner", `${changed} changed, ${added} added`);
    },
    onError: (error) => notify.error("Refresh failed", stockReportRequestFailureMessage(error)),
  });
}

/** v7 §5.20 — drafts only. The draft's lists and read are dropped (projection R11); its page closes itself (§C.4). */
export function useDeleteStockReportVersion(versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: stockReportMutationKeys.versionCommand(versionId),
    mutationFn: () => deleteStockReportVersion(versionId),
    onSuccess: () => {
      dropStockReportVersionQueries(queryClient, versionId);
      invalidate(queryClient, stockReportKeys.versionList(), stockReportKeys.draftCount());
      notify.success("Draft deleted");
    },
    onError: (error) => notify.error("Delete failed", stockReportRequestFailureMessage(error)),
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
