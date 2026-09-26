import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { stockReportKeys } from "./api/stock-report-keys";
import { wirePrioritisedStockReportItem } from "./fixtures/stock-report-wire-fixtures";
import { stockReportSocketEvents } from "./socket-events";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportItem,
} from "./stock-report.types";

const WOOD = { majorCategory: "wood" as const, missingOnly: false };
const SEAT = { majorCategory: "seat" as const, missingOnly: false };
const MISSING = { majorCategory: null, missingOnly: true };

function row(client_id: string, priority: string | null, major_category = "wood", missing = 0): StockReportItem {
  const base = wirePrioritisedStockReportItem(client_id, priority, priority ? 1 : null);
  return { ...base, item_category: { ...base.item_category, major_category }, snapshot: { ...base.snapshot!, quantity_missing: missing } };
}

/** §7: the snapshot event, keyed on the snapshot with the row in `extra`. */
function snapshotEvent(stockNeedId: string, priority: "high" | "medium" | "low" | null, priority_order: number | null, extra: Partial<{ quantity_missing: number; quantity_resolved: number }> = {}) {
  return { client_id: `snap-${stockNeedId}`, stock_report_item_id: stockNeedId, version_id: "srv-1", priority, priority_order, quantity_missing: 0, quantity_resolved: 0, ...extra };
}

const ids = (queryClient: QueryClient, bucket: "unset" | "high" | "medium" | "low" | "all", filter: typeof ALL) =>
  queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list(bucket, filter))?.map((item) => item.client_id);

describe("stock report socket cache handlers", () => {
  it("moves a priority update between cached buckets instead of dropping the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low")]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2), { queryClient } as never);

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))).toEqual([]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);
  });

  /**
   * §7: the row event lost its priority keys. It patches counters in place and
   * mirrors them into the snapshot — awaiting plus what Scanner already
   * resolved — and never moves the row.
   */
  it("patches a row's counters in place, keeps resolved units in the snapshot's awaiting, and moves nothing", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const cached = row("sri-1", "high");
    cached.snapshot = { ...cached.snapshot!, quantity_resolved: 2, quantity_awaiting: 2 };
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [cached]);

    stockReportSocketEvents["stock_report_item:updated"]?.(
      { client_id: "sri-1", quantity_requested: 7, quantity_in_queue: 1, quantity_in_progress: 1, quantity_awaiting: 3 },
      { queryClient } as never,
    );

    const [patched] = queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL)) ?? [];
    expect(patched).toMatchObject({ quantity_requested: 7, quantity_in_queue: 1, quantity_awaiting: 3 });
    expect(patched?.snapshot).toMatchObject({ quantity_in_queue: 1, quantity_in_progress: 1, quantity_awaiting: 5, priority: "high", quantity_requested: 5 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
    // Offset pages cannot be trusted after a realtime change, even though the
    // optimistic first-page patch keeps the visible counters responsive.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.lists(), refetchType: "active" });
  });

  it("converges on the same awaiting whichever of the two events lands first", () => {
    const seed = () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
      return queryClient;
    };
    const rowEvent = { client_id: "sri-1", quantity_requested: 5, quantity_in_queue: 0, quantity_in_progress: 0, quantity_awaiting: 1 };
    const snapEvent = snapshotEvent("sri-1", "high", 1, { quantity_resolved: 2 });
    const awaiting = (queryClient: QueryClient) => queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.[0]?.snapshot?.quantity_awaiting;

    const first = seed();
    stockReportSocketEvents["stock_report_item:updated"]?.(rowEvent, { queryClient: first } as never);
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapEvent, { queryClient: first } as never);
    const second = seed();
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapEvent, { queryClient: second } as never);
    stockReportSocketEvents["stock_report_item:updated"]?.(rowEvent, { queryClient: second } as never);

    expect(awaiting(first)).toBe(3);
    expect(awaiting(second)).toBe(3);
  });

  it("keeps a row in an All list across a priority change and honours the missing lists", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), [row("sri-1", "high", "wood", 2), row("sri-2", "low", "wood", 1)]);
    queryClient.setQueryData(stockReportKeys.list("low", MISSING), [row("sri-2", "low", "wood", 1)]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low")]);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 2 }), { queryClient } as never);

    // Still in All — re-sorted into the server's order: both low, 1 before 2.
    expect(ids(queryClient, "all", MISSING)).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient, "low", MISSING)).toEqual(["sri-2", "sri-1"]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);

    // Cleared to 0: it leaves every missing list but stays on the board.
    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 0 }), { queryClient } as never);
    expect(ids(queryClient, "all", MISSING)).toEqual(["sri-2"]);
    expect(ids(queryClient, "low", MISSING)).toEqual(["sri-2"]);
    expect(ids(queryClient, "low", ALL)).toEqual(["sri-2", "sri-1"]);
  });

  it("patches the open detail page's own entry, whether or not a list still holds the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.item("sri-1"), row("sri-1", "high", "wood", 3));

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2, { quantity_missing: 0, quantity_resolved: 1 }), { queryClient } as never);
    stockReportSocketEvents["stock_report_item:updated"]?.({ client_id: "sri-1", quantity_requested: 5, quantity_in_queue: 2, quantity_in_progress: 0, quantity_awaiting: 1 }, { queryClient } as never);

    const detail = queryClient.getQueryData<StockReportItem>(stockReportKeys.item("sri-1"));
    expect(detail?.snapshot).toMatchObject({ priority: "low", priority_order: 2, quantity_missing: 0, quantity_resolved: 1, quantity_in_queue: 2, quantity_awaiting: 2 });

    stockReportSocketEvents["stock_report_item:deleted"]?.({ client_id: "sri-1" }, { queryClient } as never);
    expect(queryClient.getQueryData(stockReportKeys.item("sri-1"))).toBeUndefined();
  });

  it("restarts every board list, the summary and version for a snapshot it does not hold", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("all", MISSING), []);
    queryClient.setQueryData(stockReportKeys.list("high", ALL), []);

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-9", "high", 1, { quantity_missing: 4 }), { queryClient } as never);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.lists(), refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.missingSummary(), refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: stockReportKeys.activeVersion(), refetchType: "active" });
  });

  it("refetches the board, the active version, the history and the summary when a version opens", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    stockReportSocketEvents["stock_report_snapshot_version:created"]?.({ client_id: "srv-2", snapshot_count: 12 }, { queryClient } as never);
    stockReportSocketEvents["stock_report_snapshot_version:closed"]?.({ client_id: "srv-1", snapshot_count: 12 }, { queryClient } as never);

    for (const queryKey of [stockReportKeys.lists(), stockReportKeys.activeVersion(), stockReportKeys.versionList(), stockReportKeys.missingSummary()]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey, refetchType: "active" });
    }
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

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 2), { queryClient } as never);

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

    stockReportSocketEvents["stock_report_item_snapshot:updated"]?.(snapshotEvent("sri-1", "low", 0), { queryClient } as never);

    expect(ids(queryClient, "low", WOOD)).toEqual(["sri-1", "sri-2"]);
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: stockReportKeys.bucketLists("low") }));
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

    stockReportSocketEvents["stock_report_item:deleted"]?.({ client_id: "sri-1" }, { queryClient } as never);

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((item) => item.client_id)).toEqual(["sri-2"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("unset", ALL))).toEqual([]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: stockReportKeys.assignmentList("sri-1"),
      refetchType: "active",
    });
  });

  it("is idempotent for duplicate assignment events by invalidating one cache key", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const context = { queryClient } as never;
    const payload = { client_id: "sta-1", stock_report_item_id: "sri-1", task_id: "tsk-1", state: "in_queue" };

    stockReportSocketEvents["stock_task_assignment:created"]?.(payload, context);
    stockReportSocketEvents["stock_task_assignment:created"]?.(payload, context);

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: stockReportKeys.assignmentList("sri-1"),
      refetchType: "active",
    });
  });
});
