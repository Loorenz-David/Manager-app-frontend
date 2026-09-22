import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { stockReportKeys } from "./api/stock-report-keys";
import { stockReportSocketEvents } from "./socket-events";
import type { StockReportItem } from "./stock-report.types";

function row(client_id: string, priority: string | null): StockReportItem {
  return {
    client_id,
    item_category: null,
    priority,
    priority_order: priority ? 1 : null,
  };
}

describe("stock report socket cache handlers", () => {
  it("moves a priority update between cached buckets instead of dropping the row", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockReportKeys.list("high"), [row("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low"), [row("sri-2", "low")]);

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

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high"))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low"))?.map((item) => item.client_id)).toEqual(["sri-2", "sri-1"]);
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
