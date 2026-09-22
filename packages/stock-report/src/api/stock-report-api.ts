import { apiClient, ApiRequestError } from "@beyo/api-client";
import { z } from "zod";
import {
  StockReportAssignmentSchema,
  StockReportItemSchema,
  type StockNeedBucket,
  type StockReportAssignment,
  type StockReportItem,
  type StockReportListFilter,
  type StockReportPriority,
} from "../stock-report.types";

const Envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
    warnings: z.array(z.string()).optional(),
  });
const ItemListResponse = Envelope(
  z.object({ stock_report_items: z.array(StockReportItemSchema) }),
);
const ItemResponse = Envelope(
  z.object({ stock_report_item: StockReportItemSchema }),
);
const AssignmentsResponse = Envelope(
  z.object({ stock_task_assignments: z.array(StockReportAssignmentSchema) }),
);
const AssignmentResponse = Envelope(
  z.object({ stock_task_assignments: z.array(StockReportAssignmentSchema) }),
);

export async function fetchStockReportItems(
  bucket: StockNeedBucket,
  filter: StockReportListFilter,
): Promise<StockReportItem[]> {
  const response = await apiClient.get(
    "/api/v1/stock-report/items",
    ItemListResponse,
    {
      // Omitted `priority` is the null-priority bucket, not "all" (§5.1).
      priority: bucket === "unset" ? undefined : bucket,
      // A repeated key the backend reads as `list[ItemMajorCategoryEnum]`; one
      // element today because the sheet is single-select. Omitted = all.
      item_major_categories: filter.majorCategory ? [filter.majorCategory] : undefined,
    },
  );
  return response.data.stock_report_items;
}

export async function fetchStockReportAssignments(
  stockNeedId: string,
): Promise<StockReportAssignment[]> {
  const response = await apiClient.get(
    `/api/v1/stock-report/items/${stockNeedId}/assignments`,
    AssignmentsResponse,
  );
  return response.data.stock_task_assignments;
}

export async function setStockReportPriority(
  stockNeedId: string,
  priority: StockReportPriority | null,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    `/api/v1/stock-report/items/${stockNeedId}/priority`,
    ItemResponse,
    { priority },
  );
  return response.data.stock_report_item;
}

export async function reorderStockReportItem(
  stockNeedId: string,
  priorityOrder: number,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    `/api/v1/stock-report/items/${stockNeedId}/priority-order`,
    ItemResponse,
    { priority_order: priorityOrder },
  );
  return response.data.stock_report_item;
}

export type CreateStockAssignmentInput = {
  stockReportItemId: string;
  taskId: string;
  itemId: string;
  overridePropertyMismatch: boolean;
};
export async function createStockAssignment(
  input: CreateStockAssignmentInput,
): Promise<StockReportAssignment> {
  const response = await apiClient.post(
    "/api/v1/stock-report/assignments",
    AssignmentResponse,
    {
      entries: [
        {
          stock_report_item_id: input.stockReportItemId,
          task_id: input.taskId,
          item_id: input.itemId,
          override_property_mismatch: input.overridePropertyMismatch,
        },
      ],
    },
  );
  return response.data.stock_task_assignments[0]!;
}

export async function removeStockAssignment(
  assignmentId: string,
): Promise<void> {
  await apiClient.post(
    "/api/v1/stock-report/assignments/delete",
    Envelope(z.object({ deleted_client_ids: z.array(z.string()) })),
    { client_ids: [assignmentId] },
  );
}

/**
 * One failed criterion. The preview and the create endpoint's recoverable 409
 * serialise it from the same backend helper, so one schema serves both here —
 * the two sheets a user can reach must never describe a mismatch differently.
 *
 * `accepted_values` and `item_values` are always sent and hold the normalised
 * lowercase tokens the matcher actually compared; making them display text is
 * this client's job
 * (`HANDOFF_TO_FRONTEND_stock_match_property_evaluations_20260922.md`).
 */
const MatchFailureElement = z.object({
  key: z.string(),
  reason: z.string(),
  accepted_values: z.array(z.string()),
  item_values: z.array(z.string()),
});
export type StockMatchFailure = z.infer<typeof MatchFailureElement>;

const MatchPreviewBody = z.object({
  can_proceed: z.boolean(),
  override_required: z.boolean(),
  refusal_reason: z.string().nullable(),
  property_failures: z.array(MatchFailureElement),
  matched_item_client_id: z.string().nullable(),
  values_source: z.enum(["stored", "supplied"]),
  // Informational only. Keep it at this boundary so callers cannot confuse a
  // failed advisory check with can_proceed=false.
  checks: z.array(
    z.object({
      check: z.string(),
      result: z.enum(["pass", "fail", "pass_by_construction", "not_evaluated"]),
      advisory: z.boolean(),
    }),
  ),
});
export type StockMatchPreview = z.infer<typeof MatchPreviewBody>;
export type StockMatchPreviewInput = {
  articleNumber?: string;
  sku?: string;
  itemCategoryId?: string;
  properties: Record<string, unknown>;
  quantity: number;
};
export async function previewStockAssignment(
  stockNeedId: string,
  input: StockMatchPreviewInput,
): Promise<StockMatchPreview> {
  if (!input.itemCategoryId) {
    throw new Error(
      "A category is required before previewing a stock assignment.",
    );
  }
  const body = {
    task_id: null,
    article_number: input.articleNumber ?? null,
    sku: input.articleNumber ? null : (input.sku ?? null),
    item_category_id: input.itemCategoryId,
    properties: input.properties,
    quantity: input.quantity,
  };
  const response = await apiClient.post(
    `/api/v1/stock-report/items/${stockNeedId}/match-preview`,
    Envelope(MatchPreviewBody),
    body,
  );
  return response.data;
}

export function stockAssignmentErrorDetails(error: unknown): unknown {
  return error instanceof ApiRequestError ? error.details : undefined;
}

const AssignmentMismatchDetailsSchema = z.array(
  z.object({ failures: z.array(MatchFailureElement) }),
);

const AssignmentRefusalDetailsSchema = z.array(
  z.object({ reason: z.string() }),
);

/** Parses stock-specific error details at this API boundary, never in a UI. */
export function stockAssignmentMismatchFailures(
  error: unknown,
): StockMatchFailure[] | null {
  if (
    !(error instanceof ApiRequestError) ||
    error.serverCode !== "stock_assignment_property_mismatch"
  ) {
    return null;
  }
  const parsed = AssignmentMismatchDetailsSchema.safeParse(error.details);
  return parsed.success ? (parsed.data[0]?.failures ?? []) : [];
}

/** Parses the non-overridable assignment 422 only at the stock API boundary. */
export function stockAssignmentRefusalReasons(error: unknown): string[] | null {
  if (
    !(error instanceof ApiRequestError) ||
    error.serverCode !== "stock_assignment_refused"
  ) {
    return null;
  }
  const parsed = AssignmentRefusalDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data.map((detail) => detail.reason) : [];
}
