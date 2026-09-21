import { apiClient, ApiRequestError } from "@beyo/api-client";
import { z } from "zod";
import {
  StockReportAssignmentSchema,
  StockReportItemSchema,
  type StockNeedBucket,
  type StockReportAssignment,
  type StockReportItem,
  type StockReportPriority,
} from "../stock-report.types";

const Envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ ok: z.literal(true), data, warnings: z.array(z.string()).optional() });
const ItemListResponse = Envelope(z.object({ stock_report_items: z.array(StockReportItemSchema) }));
const ItemResponse = Envelope(z.object({ stock_report_item: StockReportItemSchema }));
const AssignmentsResponse = Envelope(z.object({ stock_task_assignments: z.array(StockReportAssignmentSchema) }));
const AssignmentResponse = Envelope(z.object({ stock_task_assignments: z.array(StockReportAssignmentSchema) }));

export async function fetchStockReportItems(bucket: StockNeedBucket): Promise<StockReportItem[]> {
  const params = bucket === "unset" ? undefined : { priority: bucket };
  const response = await apiClient.get("/api/v1/stock-report/items", ItemListResponse, params);
  return response.data.stock_report_items;
}

export async function fetchStockReportAssignments(stockNeedId: string): Promise<StockReportAssignment[]> {
  const response = await apiClient.get(`/api/v1/stock-report/items/${stockNeedId}/assignments`, AssignmentsResponse);
  return response.data.stock_task_assignments;
}

export async function setStockReportPriority(stockNeedId: string, priority: StockReportPriority | null): Promise<StockReportItem> {
  const response = await apiClient.patch(`/api/v1/stock-report/items/${stockNeedId}/priority`, ItemResponse, { priority });
  return response.data.stock_report_item;
}

export async function reorderStockReportItem(stockNeedId: string, priorityOrder: number): Promise<StockReportItem> {
  const response = await apiClient.patch(`/api/v1/stock-report/items/${stockNeedId}/priority-order`, ItemResponse, { priority_order: priorityOrder });
  return response.data.stock_report_item;
}

export type CreateStockAssignmentInput = { stockReportItemId: string; taskId: string; itemId: string; overridePropertyMismatch: boolean };
export async function createStockAssignment(input: CreateStockAssignmentInput): Promise<StockReportAssignment> {
  const response = await apiClient.post("/api/v1/stock-report/assignments", AssignmentResponse, { entries: [{ stock_report_item_id: input.stockReportItemId, task_id: input.taskId, item_id: input.itemId, override_property_mismatch: input.overridePropertyMismatch }] });
  return response.data.stock_task_assignments[0]!;
}

export async function removeStockAssignment(assignmentId: string): Promise<void> {
  await apiClient.post("/api/v1/stock-report/assignments/delete", Envelope(z.object({ deleted_client_ids: z.array(z.string()) })), { client_ids: [assignmentId] });
}

const MatchPreviewBody = z.object({ can_proceed: z.boolean().optional(), override_required: z.boolean().optional(), refusal_reason: z.string().nullable().optional(), property_failures: z.array(z.object({ key: z.string(), reason: z.string() })).nullable().optional(), values_source: z.enum(["stored", "supplied"]).nullable().optional() });
export type StockMatchPreview = z.infer<typeof MatchPreviewBody>;
export type StockMatchPreviewInput = { articleNumber?: string; sku?: string; itemCategoryId?: string; properties: Record<string, unknown>; quantity: number };
export async function previewStockAssignment(stockNeedId: string, input: StockMatchPreviewInput): Promise<StockMatchPreview> {
  const body = { task_id: null, article_number: input.articleNumber, sku: input.articleNumber ? undefined : input.sku, item_category_id: input.itemCategoryId, properties: input.properties, quantity: input.quantity };
  // The backend has not pinned whether this endpoint uses the normal envelope.
  const response = await apiClient.post(`/api/v1/stock-report/items/${stockNeedId}/match-preview`, z.union([MatchPreviewBody, Envelope(MatchPreviewBody)]), body);
  return "data" in response ? response.data : response;
}

export function stockAssignmentErrorDetails(error: unknown): unknown {
  return error instanceof ApiRequestError ? error.details : undefined;
}
