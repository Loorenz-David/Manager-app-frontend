import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { stockReportKeys } from "./api/stock-report-keys";
import {
  wireBorrowingDraftSnapshot,
  wirePrioritisedStockReportItem,
  wireStockReportItem,
  wireStockReportSnapshotVersion,
} from "./fixtures/stock-report-wire-fixtures";
import { stockReportSocketEvents } from "./socket-events";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportItem,
  type StockReportItemSnapshot,
  type StockReportListFilter,
} from "./stock-report.types";

const WOOD = { majorCategory: "wood" as const, missingOnly: false, versionId: null };
const SEAT = { majorCategory: "seat" as const, missingOnly: false, versionId: null };
const MISSING = { majorCategory: null, missingOnly: true, versionId: null };
const DRAFT = { majorCategory: null, missingOnly: false, versionId: "srv-draft" };
const DRAFT_MISSING = { majorCategory: null, missingOnly: true, versionId: "srv-draft" };

const ACTIVE_KEY = { queryKey: stockReportKeys.versionLists("active"), refetchType: "active" as const };
const DRAFT_KEY = { queryKey: stockReportKeys.versionLists("srv-draft"), refetchType: "active" as const };
const ALL_LISTS_KEY = { queryKey: stockReportKeys.lists(), refetchType: "active" as const };
const invalidation = (queryKey: readonly unknown[]) => ({ queryKey, refetchType: "active" as const });

/** An active-scope row: its snapshot names the active version, `srv-1` (v7 §6.6). */
function row(client_id: string, priority: string | null, major_category = "wood", missing = 0): StockReportItem {
  const base = wirePrioritisedStockReportItem(client_id, priority, priority ? 1 : null);
  return { ...base, item_category: { ...base.item_category, major_category }, snapshot: { ...base.snapshot!, quantity_missing: missing, active_quantity_missing: missing } };
}

/** A draft-scope row of the same stock need: a draft's snapshot, borrowing the board's count by default. */
function draftRow(client_id: string, priority: string | null, snapshot: Partial<StockReportItemSnapshot> = {}): StockReportItem {
  return wireStockReportItem({
    client_id,
    snapshot: wireBorrowingDraftSnapshot({ client_id: `dsnap-${client_id}`, stock_report_item_id: client_id, priority, priority_order: priority ? 1 : null, ...snapshot }),
  });
}

type SnapshotEvent = Parameters<NonNullable<(typeof stockReportSocketEvents)["stock_report_item_snapshot:updated"]>>[0];

/** §7 / v10 §7: the snapshot event, keyed on the snapshot with the row in `extra`; every key present. */
function snapshotEvent(stockNeedId: string, priority: "high" | "medium" | "low" | null, priority_order: number | null, extra: Partial<SnapshotEvent> = {}): SnapshotEvent {
  return {
    client_id: `snap-${stockNeedId}`,
    stock_report_item_id: stockNeedId,
    version_id: "srv-1",
    priority,
    priority_order,
    quantity_requested_scanner: null,
    quantity_requested_manual: null,
    quantity_missing: 0,
    quantity_resolved: 0,
    ...extra,
  };
}

const ids = (queryClient: QueryClient, bucket: "unset" | "high" | "medium" | "low" | "all", filter: StockReportListFilter) =>
  queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list(bucket, filter))?.map((item) => item.client_id);
const first = (queryClient: QueryClient, bucket: "unset" | "high" | "medium" | "low" | "all", filter: StockReportListFilter, client_id = "sri-1") =>
  queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list(bucket, filter))?.find((item) => item.client_id === client_id);
const context = (queryClient: QueryClient) => ({ queryClient }) as never;

describe("stock report socket cache handlers", () => {
  it("moves a priority update between cached buckets instead of dropping the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low")]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2), context(queryClient));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))).toEqual([]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);
  });

  /**
   * §7: the row event lost its priority keys. It patches counters in place and
   * mirrors them into the snapshot — awaiting plus what Scanner already
   * resolved — and never moves the row. An active snapshot keeps its frozen
   * requested value.
   */
  it("patches a row's counters in place, keeps resolved units in the snapshot's awaiting, and moves nothing", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const cached = row("sri-1", "high");
    cached.snapshot = { ...cached.snapshot!, quantity_resolved: 2, quantity_awaiting: 2 };
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [cached]);

    stockReportSocketEvents["stock_report_item:updated"]?.(
      { client_id: "sri-1", quantity_requested: 7, quantity_in_queue: 1, quantity_in_progress: 1, quantity_awaiting: 3 },
      context(queryClient),
    );

    const [patched] = queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL)) ?? [];
    expect(patched).toMatchObject({ quantity_requested: 7, quantity_in_queue: 1, quantity_awaiting: 3 });
    expect(patched?.snapshot).toMatchObject({ quantity_in_queue: 1, quantity_in_progress: 1, quantity_awaiting: 5, priority: "high", quantity_requested: 5, quantity_requested_scanner: 5 });
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    // Offset pages cannot be trusted after a realtime change, even though the
    // optimistic first-page patch keeps the visible counters responsive. A row
    // event concerns every scope.
    expect(invalidate).toHaveBeenCalledWith(ALL_LISTS_KEY);
    // The draft count moves on version events only (v10 §5.23, R17).
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
  });

  /** v8 §0.1 item 9: a draft's snapshot is live — Scanner's new value moves in while Scanner's is the one in force. */
  it("moves Scanner's new requested into a draft snapshot, but not into a manual one nor an active one", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [
      draftRow("sri-1", "high"),
      draftRow("sri-2", "high", { quantity_requested: 9, quantity_requested_source: "manual" }),
    ]);

    const event = (client_id: string) => ({ client_id, quantity_requested: 7, quantity_in_queue: 0, quantity_in_progress: 0, quantity_awaiting: 0 });
    stockReportSocketEvents["stock_report_item:updated"]?.(event("sri-1"), context(queryClient));
    stockReportSocketEvents["stock_report_item:updated"]?.(event("sri-2"), context(queryClient));

    expect(first(queryClient, "high", DRAFT)?.snapshot).toMatchObject({ quantity_requested: 7, quantity_requested_scanner: 7, quantity_requested_source: "scanner" });
    expect(first(queryClient, "high", DRAFT, "sri-2")?.snapshot).toMatchObject({ quantity_requested: 9, quantity_requested_scanner: 7, quantity_requested_source: "manual" });
    expect(first(queryClient, "high", ALL)?.snapshot).toMatchObject({ quantity_requested: 5, quantity_requested_scanner: 5 });
  });

  it("converges on the same awaiting whichever of the two events lands first", () => {
    const seed = () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
      return queryClient;
    };
    const rowEvent = { client_id: "sri-1", quantity_requested: 5, quantity_in_queue: 0, quantity_in_progress: 0, quantity_awaiting: 1 };
    const snapEvent = snapshotEvent("sri-1", "high", 1, { quantity_resolved: 2 });
    const awaiting = (queryClient: QueryClient) => first(queryClient, "high", ALL)?.snapshot?.quantity_awaiting;

    const a = seed();
    stockReportSocketEvents["stock_report_item:updated"]?.(rowEvent, context(a));
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapEvent, context(a));
    const b = seed();
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapEvent, context(b));
    stockReportSocketEvents["stock_report_item:updated"]?.(rowEvent, context(b));

    expect(awaiting(a)).toBe(3);
    expect(awaiting(b)).toBe(3);
  });

  /** v8 §0.1 item 8: the requested value in force is the manual one, else Scanner's, else the row's. */
  it("applies the effective-requested rule and flips the source with it", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    const snapshot = () => first(queryClient, "high", ALL)?.snapshot;

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1, { quantity_requested_manual: 8, quantity_requested_scanner: 6 }), context(queryClient));
    expect(snapshot()).toMatchObject({ quantity_requested: 8, quantity_requested_scanner: 6, quantity_requested_source: "manual" });

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1, { quantity_requested_manual: null, quantity_requested_scanner: 6 }), context(queryClient));
    expect(snapshot()).toMatchObject({ quantity_requested: 6, quantity_requested_scanner: 6, quantity_requested_source: "scanner" });

    // Both null: the row's own value stands in for Scanner's.
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1), context(queryClient));
    expect(snapshot()).toMatchObject({ quantity_requested: 5, quantity_requested_scanner: 5, quantity_requested_source: "scanner" });
  });

  it("keeps a row in an All list across a priority change and honours the missing lists", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), [row("sri-1", "high", "wood", 2), row("sri-2", "low", "wood", 1)]);
    queryClient.setQueryData(stockReportKeys.list("low", MISSING), [row("sri-2", "low", "wood", 1)]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low")]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 2 }), context(queryClient));

    // Still in All — re-sorted into the server's order: both low, 1 before 2.
    expect(ids(queryClient, "all", MISSING)).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient, "low", MISSING)).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);

    // Cleared to 0: it leaves every missing list but stays on the board.
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 0 }), context(queryClient));
    expect(ids(queryClient, "all", MISSING)).toEqual(["sri-2"]);
    expect(ids(queryClient, "low", MISSING)).toEqual(["sri-2"]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);
  });

  it("patches the open detail page's own entry, whether or not a list still holds the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), row("sri-1", "high", "wood", 3));

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 0, quantity_resolved: 1 }), context(queryClient));
    stockReportSocketEvents["stock_report_item:updated"]?.({ client_id: "sri-1", quantity_requested: 5, quantity_in_queue: 2, quantity_in_progress: 0, quantity_awaiting: 1 }, context(queryClient));

    const detail = queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1", "active"));
    expect(detail?.snapshot).toMatchObject({ priority: "low", priority_order: 2, quantity_missing: 0, active_quantity_missing: 0, quantity_resolved: 1, quantity_in_queue: 2, quantity_awaiting: 2 });
  });

  /** Projection R5: the row's entry of every scope shares one prefix, and a delete removes them all. */
  it("on delete, removes the row's detail entry of every scope", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.item("sri-1", "active"), row("sri-1", "high"));
    queryClient.setQueryData(stockReportKeys.item("sri-1", "srv-draft"), draftRow("sri-1", "high"));
    queryClient.setQueryData(stockReportKeys.item("sri-2", "active"), row("sri-2", "high"));

    stockReportSocketEvents["stock_report_item:deleted"]?.({ client_id: "sri-1" }, context(queryClient));

    expect(queryClient.getQueryData(stockReportKeys.item("sri-1", "active"))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.item("sri-1", "srv-draft"))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.item("sri-2", "active"))).toBeDefined();
  });

  /**
   * The board's version is unknown — empty lists, no cached active version —
   * so the event can be told apart from nothing: every list is restarted, the
   * summary and the active read refetched.
   */
  it("restarts every board list, the summary and version for a snapshot whose version it cannot place", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), []);
    queryClient.setQueryData(stockReportKeys.list("high", ALL), []);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-9", "high", 1, { quantity_missing: 4 }), context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(ALL_LISTS_KEY);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
  });

  /**
   * Projection R8/R9: a draft's edit reaches the draft's lists only — the
   * active lists (whose version their own rows name, no active-version read
   * needed) are neither patched nor restarted, so the boards on the floor do
   * not refetch on every draft tap.
   */
  it("patches a draft event into the draft's lists only and restarts that scope alone", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const activeBefore = [row("sri-1", "high"), row("sri-2", "high")];
    queryClient.setQueryData(stockReportKeys.list("high", ALL), activeBefore);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftRow("sri-1", "high"), draftRow("sri-2", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", DRAFT), []);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 1, { version_id: "srv-draft", quantity_missing: 3 }), context(queryClient));

    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBe(activeBefore);
    expect(ids(queryClient, "high", DRAFT)).toEqual(["sri-2"]);
    expect(first(queryClient, "low", DRAFT)?.snapshot).toMatchObject({ priority: "low", quantity_missing: 3, quantity_missing_source: "own", active_quantity_missing: 2 });
    expect(invalidate).toHaveBeenCalledWith(DRAFT_KEY);
    expect(invalidate).not.toHaveBeenCalledWith(ACTIVE_KEY);
    expect(invalidate).not.toHaveBeenCalledWith(ALL_LISTS_KEY);
    // The draft's progress follows its effective missing (v9 §6.8); the board's reads do not move.
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.version("srv-draft")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  /** v9 §0.1 item 10: a draft event's `null` missing borrows the board's count; a number is the draft's own. */
  it("borrows the board's count on a draft event with a null missing, and types on a number", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [
      draftRow("sri-1", "high", { quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 2 }),
      draftRow("sri-2", "high", { active_quantity_missing: null }),
    ]);
    const draft = (extra: Partial<SnapshotEvent>, id = "sri-1") => snapshotEvent(id, "high", 1, { version_id: "srv-draft", ...extra });

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(draft({ quantity_missing: null }), context(queryClient));
    expect(first(queryClient, "high", DRAFT)?.snapshot).toMatchObject({ quantity_missing: 2, quantity_missing_source: "active", active_quantity_missing: 2 });

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(draft({ quantity_missing: null }, "sri-2"), context(queryClient));
    expect(first(queryClient, "high", DRAFT, "sri-2")?.snapshot).toMatchObject({ quantity_missing: 0, quantity_missing_source: "none", active_quantity_missing: null });

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(draft({ quantity_missing: 3 }), context(queryClient));
    expect(first(queryClient, "high", DRAFT)?.snapshot).toMatchObject({ quantity_missing: 3, quantity_missing_source: "own" });
  });

  /**
   * v9 §0.1 item 12 / projection R10: the board's new count reaches every
   * draft row of the same stock need — a borrowing row follows it, a typed row
   * keeps its number but its "board says N" copy moves — and the draft scope
   * is restarted; a missing-mode draft list is restarted, not patched, since
   * its membership follows the effective count (v10 §5.1). The active id is
   * the active rows' own; no active-version read is cached here (R9).
   */
  it("pushes the active version's missing into the drafts' borrowing rows and the typed rows' board copy", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high"), row("sri-2", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [
      draftRow("sri-1", "high"),
      draftRow("sri-2", "high", { quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 2 }),
    ]);
    const missingBefore = [draftRow("sri-1", "high")];
    queryClient.setQueryData(stockReportKeys.list("all", DRAFT_MISSING), missingBefore);
    queryClient.setQueryData(stockReportKeys.item("sri-2", "srv-draft"), draftRow("sri-2", "high", { quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 2 }));

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1, { quantity_missing: 7 }), context(queryClient));
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-2", "high", 1, { quantity_missing: 9 }), context(queryClient));

    expect(first(queryClient, "high", ALL)?.snapshot).toMatchObject({ quantity_missing: 7, active_quantity_missing: 7, quantity_missing_source: "own" });
    expect(first(queryClient, "high", DRAFT)?.snapshot).toMatchObject({ quantity_missing: 7, quantity_missing_source: "active", active_quantity_missing: 7 });
    expect(first(queryClient, "high", DRAFT, "sri-2")?.snapshot).toMatchObject({ quantity_missing: 4, quantity_missing_source: "own", active_quantity_missing: 9 });
    expect(queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-2", "srv-draft"))?.snapshot).toMatchObject({ quantity_missing: 4, active_quantity_missing: 9 });
    expect(queryClient.getQueryData(stockReportKeys.list("all", DRAFT_MISSING))).toBe(missingBefore);
    expect(invalidate).toHaveBeenCalledWith(ACTIVE_KEY);
    expect(invalidate).toHaveBeenCalledWith(DRAFT_KEY);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.activeVersion()));
  });

  it("leaves a draft's list untouched for an event of another draft, and falls back to the cached active version for an empty board", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.activeVersion("high,medium,low"), wireStockReportSnapshotVersion({ client_id: "srv-1" }));
    queryClient.setQueryData(stockReportKeys.list("high", ALL), []);
    const draftBefore = [draftRow("sri-1", "high")];
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), draftBefore);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1, { version_id: "srv-other", quantity_missing: 5 }), context(queryClient));
    expect(queryClient.getQueryData(stockReportKeys.list("high", DRAFT))).toBe(draftBefore);
    expect(invalidate).not.toHaveBeenCalledWith(DRAFT_KEY);
    expect(invalidate).not.toHaveBeenCalledWith(ALL_LISTS_KEY);

    // The board is empty, but the cached active version names srv-1: an
    // active event still reaches the draft's borrowing row.
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "high", 1, { quantity_missing: 5 }), context(queryClient));
    expect(first(queryClient, "high", DRAFT)?.snapshot).toMatchObject({ quantity_missing: 5, quantity_missing_source: "active" });
  });

  it("refetches the board, the active version, the history and the summary when an active version opens or closes", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_snapshot_version:created"]?.({ client_id: "srv-2", snapshot_count: 12, state: "active", title: null }, context(queryClient));
    stockReportSocketEvents["stock_report_snapshot_version:closed"]?.({ client_id: "srv-1", snapshot_count: 12 }, context(queryClient));

    for (const queryKey of [stockReportKeys.lists(), stockReportKeys.activeVersion(), stockReportKeys.versionList(), stockReportKeys.missingSummary()]) {
      expect(invalidate).toHaveBeenCalledWith(invalidation(queryKey));
    }
  });

  /** v8 §7: a new draft touches nothing on the board — the drafts list and the hub's count only (R17: the leaves). */
  it("refetches only the versions list and the draft count when a draft is created", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_snapshot_version:created"]?.({ client_id: "srv-3", snapshot_count: 12, state: "draft", title: "Autumn" }, context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
    expect(invalidate).not.toHaveBeenCalledWith(ALL_LISTS_KEY);
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  /**
   * v10 §7: activation emits no per-row events; the closed board's lists are
   * dropped and every draft scope restarted, since each draft now borrows from
   * the new active version.
   */
  it("drops the closed board and restarts every draft when a version is activated", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftRow("sri-1", "high")]);

    stockReportSocketEvents["stock_report_snapshot_version:activated"]?.({ client_id: "srv-draft", snapshot_count: 12, title: null, scheduled: true, keep_active_missing: false }, context(queryClient));

    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.list("high", DRAFT))).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith(DRAFT_KEY);
    for (const queryKey of [stockReportKeys.versionList(), stockReportKeys.activeVersion(), stockReportKeys.version("srv-draft"), stockReportKeys.draftCount(), stockReportKeys.missingSummary()]) {
      expect(invalidate).toHaveBeenCalledWith(invalidation(queryKey));
    }
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  it("restarts the board and the version's scope and every version read when the live version is refreshed", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_snapshot_version:refreshed"]?.({ client_id: "srv-1", snapshot_count: 12, keep_manual_requested: true }, context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(ACTIVE_KEY);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionLists("srv-1")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.missingSummary()));
  });

  it("refetches the versions list and the one version when a title or schedule changes", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_snapshot_version:updated"]?.({ client_id: "srv-draft", title: "Autumn", scheduled_activation_at: null, scheduled_activation_keeps_active_missing: false }, context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.version("srv-draft")));
    expect(invalidate).not.toHaveBeenCalledWith(ALL_LISTS_KEY);
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.versions()));
  });

  it("drops a deleted draft's lists and read and refetches the versions list and the count", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftRow("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.version("srv-draft", "high,medium,low"), wireStockReportSnapshotVersion({ client_id: "srv-draft", state: "draft" }));

    stockReportSocketEvents["stock_report_snapshot_version:deleted"]?.({ client_id: "srv-draft" }, context(queryClient));

    expect(queryClient.getQueryData(stockReportKeys.list("high", DRAFT))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.version("srv-draft", "high,medium,low"))).toBeUndefined();
    expect(queryClient.getQueryData(stockReportKeys.list("high", ALL))).toBeDefined();
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
  });

  /** v8 §5.4: a new Scanner row belongs to every version; each draft's count rose (v10 §5.4). */
  it("restarts every scope and the versions list — not the draft count — when a row is created", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_item:created"]?.({ client_id: "sri-9" }, context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(ALL_LISTS_KEY);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
    expect(invalidate).not.toHaveBeenCalledWith(invalidation(stockReportKeys.draftCount()));
  });

  /**
   * The key carries the category filter after the bucket. Reading the bucket
   * as the last segment would compare "wood" to "low" and drop the row.
   */
  it("routes a move by the key's bucket segment and only into lists whose filter the row satisfies", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", WOOD), [row("sri-1", "high", "wood")]);
    queryClient.setQueryData(stockReportKeys.list("low", WOOD), [row("sri-2", "low", "wood")]);
    queryClient.setQueryData(stockReportKeys.list("low", SEAT), [row("sri-3", "low", "seat")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low", "wood"), row("sri-3", "low", "seat")]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2), context(queryClient));

    expect(ids(queryClient, "high", WOOD)).toEqual([]);
    expect(ids(queryClient, "low", WOOD)).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-3", "sri-1"]);
    // A wood row never lands in the Seat-filtered list.
    expect(ids(queryClient, "low", SEAT)).toEqual(["sri-3"]);
  });

  /**
   * A bucket read off the wrong key segment never equals the destination, so
   * every update looks like a move: the row is stripped, appended unsorted, and
   * the bucket needlessly refetched. An in-bucket reorder tells the two apart.
   */
  it("re-sorts an in-bucket order change in place instead of treating it as a move", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const ordered = (client_id: string, priority_order: number) => {
      const base = row(client_id, "low");
      return { ...base, snapshot: { ...base.snapshot!, priority_order } };
    };
    queryClient.setQueryData(stockReportKeys.list("low", WOOD), [ordered("sri-2", 1), ordered("sri-1", 2)]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 0), context(queryClient));

    expect(ids(queryClient, "low", WOOD)).toEqual(["sri-1", "sri-2"]);
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: stockReportKeys.bucketLists("active", "low") }));
  });

  /**
   * The detail page has no read endpoint of its own: it renders the row from
   * these lists and its only exit is the assignments query 404-ing. Stripping
   * the row alone would leave an open page on "Loading" forever (W-2).
   */
  it("on delete, removes the row from every list and refetches its assignments so an open detail page can close", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high"), row("sri-2", "high")]);
    queryClient.setQueryData(stockReportKeys.list("unset", ALL), [row("sri-1", null)]);
    queryClient.setQueryData(stockReportKeys.list("high", DRAFT), [draftRow("sri-1", "high")]);

    stockReportSocketEvents["stock_report_item:deleted"]?.({ client_id: "sri-1" }, context(queryClient));

    expect(ids(queryClient, "high", ALL)).toEqual(["sri-2"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("unset", ALL))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", DRAFT))).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.assignmentList("sri-1")));
    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.versionList()));
  });

  it("is idempotent for duplicate assignment events by invalidating one cache key", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const payload = { client_id: "sta-1", stock_report_item_id: "sri-1", task_id: "tsk-1", state: "in_queue" };

    stockReportSocketEvents["stock_task_assignment:created"]?.(payload, context(queryClient));
    stockReportSocketEvents["stock_task_assignment:created"]?.(payload, context(queryClient));

    expect(invalidate).toHaveBeenCalledWith(invalidation(stockReportKeys.assignmentList("sri-1")));
  });
});
