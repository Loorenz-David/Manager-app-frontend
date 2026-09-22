import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { stockReportKeys } from "./api/stock-report-keys";
import { wireStockReportItem } from "./fixtures/stock-report-wire-fixtures";
import { stockReportSocketEvents } from "./socket-events";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportItem,
} from "./stock-report.types";

const WOOD = { majorCategory: "wood" as const };
const SEAT = { majorCategory: "seat" as const };

function row(client_id: string, priority: string | null, major_category = "wood"): StockReportItem {
  const base = wireStockReportItem({
    client_id,
    priority,
    priority_order: priority ? 1 : null,
  });
  return { ...base, item_category: { ...base.item_category, major_category } };
}

describe("stock report socket cache handlers", () => {
  it("moves a priority update between cached buckets instead of dropping the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [row("sri-2", "low")]);

    stockReportSocketEvents["stock_report_item:updated"]?.(
      {
        client_id: "sri-1",
        quantity_requested: 3,
        quantity_in_queue: 0,
        quantity_in_progress: 0,
        quantity_awaiting: 0,
        priority: "low",
        priority_order: 2,
      },
      { queryClient } as never,
    );

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL))?.map((item) => item.client_id)).toEqual(["sri-2", "sri-1"]);
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

    stockReportSocketEvents["stock_report_item:updated"]?.(
      { client_id: "sri-1", quantity_requested: 3, quantity_in_queue: 0, quantity_in_progress: 0, quantity_awaiting: 0, priority: "low", priority_order: 2 },
      { queryClient } as never,
    );

    const ids = (bucket: "high" | "low", filter: typeof ALL) =>
      queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list(bucket, filter))?.map((item) => item.client_id);
    expect(ids("high", WOOD)).toEqual([]);
    expect(ids("low", WOOD)).toEqual(["sri-2", "sri-1"]);
    expect(ids("low", ALL)).toEqual(["sri-2", "sri-3", "sri-1"]);
    // A wood row never lands in the Seat-filtered list.
    expect(ids("low", SEAT)).toEqual(["sri-3"]);
  });

  /**
   * A bucket read off the wrong key segment never equals the destination, so
   * every update looks like a move: the row is stripped, appended unsorted, and
   * the bucket needlessly refetched. An in-bucket reorder tells the two apart.
   */
  it("re-sorts an in-bucket order change in place instead of treating it as a move", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(stockReportKeys.list("low", WOOD), [
      { ...row("sri-2", "low"), priority_order: 1 },
      { ...row("sri-1", "low"), priority_order: 2 },
    ]);

    stockReportSocketEvents["stock_report_item:updated"]?.(
      { client_id: "sri-1", quantity_requested: 3, quantity_in_queue: 0, quantity_in_progress: 0, quantity_awaiting: 0, priority: "low", priority_order: 0 },
      { queryClient } as never,
    );

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", WOOD))?.map((item) => item.client_id)).toEqual(["sri-1", "sri-2"]);
    expect(invalidate).not.toHaveBeenCalled();
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
