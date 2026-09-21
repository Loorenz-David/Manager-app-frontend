import type { SocketEventHandlers } from "@beyo/realtime";
import { z } from "zod";
import { stockReportKeys } from "./api/stock-report-keys";
import type { StockReportItem } from "./stock-report.types";

const ItemIdSchema = z.object({ client_id: z.string() });
const ItemUpdatedSchema = ItemIdSchema.extend({
  quantity_requested: z.number().nullable(),
  quantity_in_queue: z.number().nullable(),
  quantity_in_progress: z.number().nullable(),
  quantity_awaiting: z.number().nullable(),
  priority: z.string().nullable(),
  priority_order: z.number().nullable(),
});
const AssignmentEventSchema = ItemIdSchema.extend({ stock_report_item_id: z.string(), task_id: z.string(), state: z.string() });

function bucket(priority: string | null | undefined): "unset" | "high" | "medium" | "low" | null {
  return priority === null || priority === undefined ? "unset" : priority === "high" || priority === "medium" || priority === "low" ? priority : null;
}

function updateCachedItem(queryClient: Parameters<NonNullable<SocketEventHandlers["stock_report_item:updated"]>>[1]["queryClient"], payload: z.infer<typeof ItemUpdatedSchema>): void {
  const destination = bucket(payload.priority);
  for (const [key, rows] of queryClient.getQueriesData<StockReportItem[]>({ queryKey: stockReportKeys.lists() })) {
    const currentBucket = key.at(-1);
    const existing = rows?.find((row) => row.client_id === payload.client_id);
    if (!existing) continue;
    const patched = { ...existing, ...payload } as StockReportItem;
    if (currentBucket === destination) {
      queryClient.setQueryData(key, (list: StockReportItem[] | undefined) => (list ?? []).map((row) => row.client_id === payload.client_id ? patched : row).toSorted((a, b) => (a.priority_order ?? Number.MAX_SAFE_INTEGER) - (b.priority_order ?? Number.MAX_SAFE_INTEGER)));
    } else {
      queryClient.setQueryData(key, (list: StockReportItem[] | undefined) => (list ?? []).filter((row) => row.client_id !== payload.client_id));
      const destinationKey = stockReportKeys.list(destination ?? "unset");
      if (destination && queryClient.getQueryState(destinationKey)) queryClient.setQueryData(destinationKey, (list: StockReportItem[] | undefined) => [...(list ?? []), patched]);
      if (destination) queryClient.invalidateQueries({ queryKey: destinationKey, refetchType: "active" });
    }
  }
}

export const stockReportSocketEvents: SocketEventHandlers = {
  "stock_report_item:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({ queryKey: stockReportKeys.lists(), refetchType: "active" });
  },
  "stock_report_item:updated": (payload, { queryClient }) => {
    const parsed = ItemUpdatedSchema.safeParse(payload);
    if (!parsed.success) { queryClient.invalidateQueries({ queryKey: stockReportKeys.lists(), refetchType: "active" }); return; }
    updateCachedItem(queryClient, parsed.data);
  },
  "stock_report_item:deleted": (payload, { queryClient }) => {
    const parsed = ItemIdSchema.safeParse(payload);
    if (!parsed.success) { queryClient.invalidateQueries({ queryKey: stockReportKeys.lists(), refetchType: "active" }); return; }
    for (const [key] of queryClient.getQueriesData({ queryKey: stockReportKeys.lists() })) queryClient.setQueryData<StockReportItem[]>(key, (rows = []) => rows.filter((row) => row.client_id !== parsed.data.client_id));
  },
  "stock_task_assignment:created": assignmentInvalidator,
  "stock_task_assignment:state-changed": assignmentInvalidator,
  "stock_task_assignment:deleted": assignmentInvalidator,
};

function assignmentInvalidator(payload: unknown, { queryClient }: Parameters<NonNullable<SocketEventHandlers["stock_task_assignment:created"]>>[1]): void {
  const parsed = AssignmentEventSchema.safeParse(payload);
  if (!parsed.success) { queryClient.invalidateQueries({ queryKey: stockReportKeys.assignments(), refetchType: "active" }); return; }
  queryClient.invalidateQueries({ queryKey: stockReportKeys.assignmentList(parsed.data.stock_report_item_id), refetchType: "active" });
}
