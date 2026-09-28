import { apiClient, ApiRequestError } from "@beyo/api-client";
import { z } from "zod";
import {
  STOCK_REPORT_PRIORITY,
  StockReportAssignmentSchema,
  StockReportItemSchema,
  StockReportMissingSummarySchema,
  StockReportSnapshotVersionRowSchema,
  StockReportSnapshotVersionSchema,
  type StockReportAssignment,
  type StockReportBoardBucket,
  type StockReportItem,
  type StockReportListFilter,
  type StockReportMissingSummary,
  type StockReportPriority,
  type StockReportSnapshotVersion,
  type StockReportSnapshotVersionRow,
  type StockReportVersionState,
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
const VersionResponse = Envelope(
  z.object({ stock_report_snapshot_version: StockReportSnapshotVersionSchema }),
);
/** The command responses carry the §6.7 row without `progress` (v7 §6.7). */
const VersionRowResponse = Envelope(
  z.object({ stock_report_snapshot_version: StockReportSnapshotVersionRowSchema }),
);
const RefreshResponse = Envelope(
  z.object({
    stock_report_snapshot_version: StockReportSnapshotVersionRowSchema,
    changed: z.number(),
    added: z.number(),
  }),
);
const DeletedVersionResponse = Envelope(z.object({ client_id: z.string() }));
const DraftCountResponse = Envelope(z.object({ draft_count: z.number().int().nonnegative() }));
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
      // On a draft the filter reads the effective missing (v10 §5.1).
      missing_only: filter.missingOnly ? true : undefined,
      // Omitted = the active version (the board); an id = that version's rows,
      // live on a draft (v7 §5.1, v8 §5.1).
      version_id: filter.versionId ?? undefined,
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

/**
 * Which snapshots a version's `progress` sums. The two version reads take the
 * board's own `priority` parameter (backend `_priority_filter.py`, owner
 * request 2026-09-26): a comma list of priorities, or `all` alone. Omitting it
 * counts the **null-priority** snapshots only — never what the hub wants — so
 * every caller sends a filter, and the default is the three priorities.
 */
export type StockReportProgressPriorityFilter = readonly StockReportPriority[] | "all";
export const STOCK_REPORT_PROGRESS_PRIORITIES: StockReportProgressPriorityFilter = STOCK_REPORT_PRIORITY;

/** The wire form of a progress filter: `high,medium,low` or `all`. */
export function progressPriorityParam(filter: StockReportProgressPriorityFilter): string {
  return filter === "all" ? "all" : filter.join(",");
}

/** §5.12 — `null` is the board's normal empty state before the first version. */
export async function fetchActiveStockReportVersion(
  priorities: StockReportProgressPriorityFilter = STOCK_REPORT_PROGRESS_PRIORITIES,
): Promise<StockReportSnapshotVersion | null> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/versions/active",
    ActiveVersionResponse,
    { priority: progressPriorityParam(priorities) },
  );
  return response.data.stock_report_snapshot_version;
}

export type StockReportVersionPage = {
  versions: StockReportSnapshotVersion[];
  hasMore: boolean;
  limit: number;
  offset: number;
};

/**
 * §5.9 — drafts first (newest created first), then the active and closed
 * versions by `active_at` newest first; `limit` is capped at 200 by the
 * backend. `priorities` selects the snapshots each row's `progress` sums.
 * `states` narrows the rows to those states as a comma list (v10 §5.9:
 * `state=active,closed` is the history page's one call); empty = every state.
 */
export async function fetchStockReportVersions({
  limit,
  offset,
  priorities = STOCK_REPORT_PROGRESS_PRIORITIES,
  states = [],
}: {
  limit: number;
  offset: number;
  priorities?: StockReportProgressPriorityFilter;
  states?: readonly StockReportVersionState[];
}): Promise<StockReportVersionPage> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/versions",
    VersionListResponse,
    {
      limit,
      offset,
      priority: progressPriorityParam(priorities),
      state: states.length > 0 ? states.join(",") : undefined,
    },
  );
  const pagination = response.data.stock_report_snapshot_versions_pagination;
  return {
    versions: response.data.stock_report_snapshot_versions,
    hasMore: pagination.has_more,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

/** v7 §5.13 — one version, any state, with its progress under the same filter as §5.9. */
export async function fetchStockReportVersion(
  versionId: string,
  priorities: StockReportProgressPriorityFilter = STOCK_REPORT_PROGRESS_PRIORITIES,
): Promise<StockReportSnapshotVersion> {
  const response = await apiClient.get(
    `/api/v1/stock-report/snapshots/versions/${versionId}`,
    VersionResponse,
    { priority: progressPriorityParam(priorities) },
  );
  return response.data.stock_report_snapshot_version;
}

/** v10 §5.23 — the count of drafts, nothing else; the hub badge's source. */
export async function fetchStockReportDraftCount(): Promise<number> {
  const response = await apiClient.get(
    "/api/v1/stock-report/snapshots/versions/draft-count",
    DraftCountResponse,
  );
  return response.data.draft_count;
}

export type CreateStockReportVersionInput = {
  /** `false` opens a new active version, closing the current one; `true` makes a draft. */
  draft: boolean;
  /** Trimmed by the backend; `null` (or blank) = no title. ≤ 200 characters after trimming (v10 §5.8). */
  title: string | null;
  /** Drafts only — ISO 8601 with an offset; `null` = no schedule. */
  scheduledAt?: string | null;
  /** Drafts only — what a scheduled activation does with untyped missing counts (v9 §5.8). */
  keepActiveMissing?: boolean;
};

/**
 * §5.8 (v7, v9) — opens an active version or makes a draft. No input sends no
 * body at all (v6). Both schedule keys are sent only with `draft: true`: with
 * `draft: false` either one, even `null`, is a 422 `STOCK_REPORT_VERSION_NOT_DRAFT`.
 * The response carries the version row only (no `progress`), so callers
 * refetch a read rather than seeding it from here.
 */
export async function createStockReportVersion(
  input?: CreateStockReportVersionInput,
): Promise<StockReportSnapshotVersionRow> {
  const body =
    input === undefined
      ? undefined
      : {
          draft: input.draft,
          title: input.title,
          ...(input.draft && input.scheduledAt !== undefined
            ? { scheduled_activation_at: input.scheduledAt }
            : {}),
          ...(input.draft && input.keepActiveMissing !== undefined
            ? { scheduled_activation_keeps_active_missing: input.keepActiveMissing }
            : {}),
        };
  const response = await apiClient.post(
    "/api/v1/stock-report/snapshots/versions",
    VersionRowResponse,
    // `undefined` sends no body at all — exactly v6 (§5.8).
    body,
  );
  return response.data.stock_report_snapshot_version;
}

export type UpdateStockReportVersionInput = {
  /** Any state; `null` clears. */
  title?: string | null;
  /** Drafts only; `null` unschedules. */
  scheduledAt?: string | null;
  /** Drafts only (v9 §5.19). */
  keepActiveMissing?: boolean;
};

/**
 * v7 §5.19 / v9 §5.19 — only the keys the caller sets are sent: an omitted
 * key is left untouched by the backend, a `null` clears it. A schedule key on
 * a non-draft is a 422 `STOCK_REPORT_VERSION_NOT_DRAFT`, so callers never set
 * one for an active version.
 */
export async function updateStockReportVersion(
  versionId: string,
  patch: UpdateStockReportVersionInput,
): Promise<StockReportSnapshotVersionRow> {
  const response = await apiClient.patch(
    `/api/v1/stock-report/snapshots/versions/${versionId}`,
    VersionRowResponse,
    {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.scheduledAt !== undefined ? { scheduled_activation_at: patch.scheduledAt } : {}),
      ...(patch.keepActiveMissing !== undefined
        ? { scheduled_activation_keeps_active_missing: patch.keepActiveMissing }
        : {}),
    },
  );
  return response.data.stock_report_snapshot_version;
}

/**
 * v9 §5.17 — publishes a draft as the board. The body is exactly
 * `{ keep_active_missing }` (unknown keys are 422): whether the rows this
 * draft typed no missing for keep the closing board's counts or start at 0.
 * Manual activation uses only this body, never the draft's stored flag.
 */
export async function activateStockReportVersion(
  versionId: string,
  { keepActiveMissing }: { keepActiveMissing: boolean },
): Promise<StockReportSnapshotVersionRow> {
  const response = await apiClient.post(
    `/api/v1/stock-report/snapshots/versions/${versionId}/activate`,
    VersionRowResponse,
    { keep_active_missing: keepActiveMissing },
  );
  return response.data.stock_report_snapshot_version;
}

export type RefreshStockReportVersionResult = {
  version: StockReportSnapshotVersionRow;
  /** Snapshots whose effective requested changed. */
  changed: number;
  /** Rows created since activation that joined the version. */
  added: number;
};

/**
 * v8 §5.18 — re-freezes the active version's Scanner values from the live
 * rows. `keepManualRequested: true` (the backend default; the body is then
 * omitted) leaves typed values in force; `false` clears them. A draft or a
 * closed version is 422 `STOCK_REPORT_VERSION_NOT_ACTIVE`.
 */
export async function refreshStockReportVersionRequested(
  versionId: string,
  { keepManualRequested }: { keepManualRequested: boolean } = { keepManualRequested: true },
): Promise<RefreshStockReportVersionResult> {
  const response = await apiClient.post(
    `/api/v1/stock-report/snapshots/versions/${versionId}/refresh-requested`,
    RefreshResponse,
    keepManualRequested ? undefined : { keep_manual_requested: false },
  );
  return {
    version: response.data.stock_report_snapshot_version,
    changed: response.data.changed,
    added: response.data.added,
  };
}

/** v7 §5.20 — hard-deletes a draft (a non-draft is 422 `STOCK_REPORT_VERSION_NOT_DRAFT`). */
export async function deleteStockReportVersion(versionId: string): Promise<string> {
  const response = await apiClient.delete(
    `/api/v1/stock-report/snapshots/versions/${versionId}`,
    DeletedVersionResponse,
  );
  return response.data.client_id;
}

/**
 * The v6 shortcut edits the active version's row; the versioned twin
 * (v7 §5.14–5.16) edits the row inside one version, draft or active. Same
 * write, same events; only the not-found mapping and a race with an
 * activation differ (v10 §5.2), so the board keeps the shortcut and a draft
 * page sends its id.
 */
function itemEditPath(stockNeedId: string, action: string, versionId?: string): string {
  return versionId === undefined
    ? `/api/v1/stock-report/items/${stockNeedId}/${action}`
    : `/api/v1/stock-report/snapshots/versions/${versionId}/items/${stockNeedId}/${action}`;
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
 * §5.7 / v7 §5.16 / v9 §5.16 — an **absolute** value, never a delta;
 * `0 <= value <= ceiling` or the backend answers 422
 * `STOCK_REPORT_MISSING_EXCEEDS_CEILING`. Roles: admin, manager, worker.
 * `null` clears a draft's typed value so the row borrows the board's count
 * again; it needs the versioned route (the shortcut keeps its non-null body,
 * and `null` on the active version is a 422).
 */
export async function setStockReportMissingQuantity(
  stockNeedId: string,
  quantityMissing: number | null,
  versionId?: string,
): Promise<StockReportItem> {
  if (quantityMissing === null && versionId === undefined) {
    throw new Error("Clearing a typed missing count needs the version's id (v9 §5.16).");
  }
  const response = await apiClient.patch(
    itemEditPath(stockNeedId, "missing-quantity", versionId),
    ItemResponse,
    { quantity_missing: quantityMissing },
  );
  return response.data.stock_report_item;
}

/**
 * v8 §5.22 / v9 §5.22 — a number pins the row's requested value by hand (even
 * the value Scanner shows: the pin is the point); `null` reverts to Scanner's.
 * There is no active-version shortcut: the board sends the active version's
 * id (the row's own `snapshot.version_id`). Roles: admin, manager, seller.
 */
export async function setStockReportRequestedQuantity(
  stockNeedId: string,
  quantityRequested: number | null,
  versionId: string,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    itemEditPath(stockNeedId, "requested-quantity", versionId),
    ItemResponse,
    { quantity_requested: quantityRequested },
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

/** §5.2 / v7 §5.14 — the board's shortcut, or one version's row with `versionId`. */
export async function setStockReportPriority(
  stockNeedId: string,
  priority: StockReportPriority | null,
  versionId?: string,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    itemEditPath(stockNeedId, "priority", versionId),
    ItemResponse,
    { priority },
  );
  return response.data.stock_report_item;
}

/** §5.3 / v7 §5.15 — groups are numbered per version. */
export async function reorderStockReportItem(
  stockNeedId: string,
  priorityOrder: number,
  versionId?: string,
): Promise<StockReportItem> {
  const response = await apiClient.patch(
    itemEditPath(stockNeedId, "priority-order", versionId),
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
