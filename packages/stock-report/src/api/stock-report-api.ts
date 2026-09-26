import { apiClient, ApiRequestError } from "@beyo/api-client";
import { z } from "zod";
import {
  StockReportAssignmentSchema,
  StockReportItemSchema,
  StockReportMissingSummarySchema,
  StockReportSnapshotVersionSchema,
  type StockReportAssignment,
  type StockReportBoardBucket,
  type StockReportItem,
  type StockReportListFilter,
  type StockReportMissingSummary,
  type StockReportPriority,
  type StockReportSnapshotVersion,
} from "../stock-report.types";

const Envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
    warnings: z.array(z.string()).optional(),
  });
const ItemListResponse = Envelope(
  z.object({
    stock_report_items: z.array(StockReportItemSchema),
    stock_report_items_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
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
const ActiveVersionResponse = Envelope(
  z.object({ stock_report_snapshot_version: StockReportSnapshotVersionSchema.nullable() }),
);
const VersionListResponse = Envelope(
  z.object({
    stock_report_snapshot_versions: z.array(StockReportSnapshotVersionSchema),
    stock_report_snapshot_versions_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);
const MissingSummaryResponse = Envelope(StockReportMissingSummarySchema);

export type StockReportItemPage = {
  items: StockReportItem[];
  hasMore: boolean;
  limit: number;
  offset: number;
};

export async function fetchStockReportItems(
  bucket: StockReportBoardBucket,
  filter: StockReportListFilter,
  pagination: { limit: number; offset: number },
): Promise<StockReportItemPage> {
  const response = await apiClient.get(
    "/api/v1/stock-report/items",
    ItemListResponse,
    {
      // Omitted `priority` is the null-priority bucket, not "all" (§5.1);
      // `all` is its own token and passes through as-is (owner, 2026-09-26).
      priority: bucket === "unset" ? undefined : bucket,
      // A repeated key the backend reads as `list[ItemMajorCategoryEnum]`; one
      // element today because the sheet is single-select. Omitted = all.
      item_major_categories: filter.majorCategory ? [filter.majorCategory] : undefined,
      // Only snapshots with `quantity_missing > 0` — the buyer's list (§5.1).
      missing_only: filter.missingOnly ? true : undefined,
      limit: pagination.limit,
      offset: pagination.offset,
    },
  );
  const page = response.data.stock_report_items_pagination;
  return {
    items: response.data.stock_report_items,
    hasMore: page.has_more,
    limit: page.limit,
    offset: page.offset,
  };
}

/** §5.12 — `null` is the board's normal empty state before the first version. */
export async function fetchActiveStockReportVersion(): Promise<StockReportSnapshotVersion | null> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/versions/active",
    ActiveVersionResponse,
  );
  return response.data.stock_report_snapshot_version;
}

export type StockReportVersionPage = {
  versions: StockReportSnapshotVersion[];
  hasMore: boolean;
  limit: number;
  offset: number;
};

/** §5.9 — newest first; `limit` is capped at 200 by the backend. */
export async function fetchStockReportVersions(params: {
  limit: number;
  offset: number;
}): Promise<StockReportVersionPage> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/versions",
    VersionListResponse,
    params,
  );
  const pagination = response.data.stock_report_snapshot_versions_pagination;
  return {
    versions: response.data.stock_report_snapshot_versions,
    hasMore: pagination.has_more,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

/**
 * §5.8 — opens a version, closing the active one in the same transaction. No
 * body. The response carries the version row only (no `progress`), so callers
 * refetch the active version rather than seeding it from here.
 */
export async function createStockReportVersion(): Promise<
  Omit<StockReportSnapshotVersion, "progress">
> {
  const response = await apiClient.post(
    "/api/v1/stock-report/snapshots/versions",
    Envelope(
      z.object({
        stock_report_snapshot_version: StockReportSnapshotVersionSchema.omit({ progress: true }),
      }),
    ),
    // `undefined` sends no body at all — the route takes none (§5.8).
    undefined,
  );
  return response.data.stock_report_snapshot_version;
}

/** §5.11 — both counters over the workspace's active snapshots. */
export async function fetchStockReportMissingSummary(): Promise<StockReportMissingSummary> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/missing-summary",
    MissingSummaryResponse,
  );
  return response.data;
}

/**
 * §5.7 — an **absolute** value, never a delta; `0 <= value <= ceiling` or the
 * backend answers 422 `STOCK_REPORT_MISSING_EXCEEDS_CEILING`. Roles: admin,
 * manager, worker.
 */
export async function setStockReportMissingQuantity(
  stockNeedId: string,
  quantityMissing: number,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    `/api/v1/stock-report/items/${stockNeedId}/missing-quantity`,
    ItemResponse,
    { quantity_missing: quantityMissing },
  );
  return response.data.stock_report_item;
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
