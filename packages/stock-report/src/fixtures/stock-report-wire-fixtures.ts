/**
 * Wire-shaped builders for the unit tests, one per payload the backend pins in
 * `stock_report_improvments/HANDOFF_TO_FRONTEND_stock_report_snapshots_20260926.md`
 * §6. They
 * hold every required key so a test that wants one field different can
 * override only that field and still satisfy the schema. Nothing here is a
 * component prop — those live in `stock-report-fixtures.ts`.
 */

import type {
  StockReportAssignment,
  StockReportItem,
  StockReportItemSnapshot,
  StockReportMissingSummary,
  StockReportSnapshotVersion,
  StockReportVersionProgress,
  StockReportVersionProgressCounters,
} from "../stock-report.types";

export function wireStockReportItemSnapshot(
  overrides: Partial<StockReportItemSnapshot> = {},
): StockReportItemSnapshot {
  return {
    client_id: "srs-1",
    version_id: "srv-1",
    stock_report_item_id: "sri-1",
    quantity_requested: 5,
    quantity_in_queue: 0,
    quantity_in_progress: 0,
    quantity_awaiting: 0,
    quantity_missing: 0,
    quantity_resolved: 0,
    priority: "high",
    priority_order: 1,
    active_at: "2026-09-26T08:00:00+00:00",
    closed_at: null,
    created_at: "2026-09-26T08:00:00+00:00",
    updated_at: null,
    updated_by_id: null,
    ...overrides,
  };
}

/**
 * A board row. The snapshot mirrors the row's live counters by default, as it
 * does on the wire while the version is active (§6.6); a test that wants the
 * two to differ overrides `snapshot` explicitly.
 */
export function wireStockReportItem(
  overrides: Partial<StockReportItem> = {},
): StockReportItem {
  const quantities = {
    quantity_requested: overrides.quantity_requested ?? 5,
    quantity_in_queue: overrides.quantity_in_queue ?? 0,
    quantity_in_progress: overrides.quantity_in_progress ?? 0,
    quantity_awaiting: overrides.quantity_awaiting ?? 0,
  };
  const clientId = overrides.client_id ?? "sri-1";
  return {
    client_id: clientId,
    item_category: {
      client_id: "cat-1",
      name: "Dining chair",
      major_category: "seat",
      image_url: null,
    },
    properties: { wood_group: ["teak"] },
    properties_signature: "sig-1",
    created_at: "2026-09-20T09:00:00+00:00",
    updated_at: null,
    created_by_id: null,
    updated_by_id: null,
    snapshot: wireStockReportItemSnapshot({
      client_id: `snap-${clientId}`,
      stock_report_item_id: clientId,
      ...quantities,
    }),
    ...overrides,
    ...quantities,
  };
}

/**
 * Sets the row's snapshot priority the way the old row-level keys did, so a
 * test can still say "a high row at position 3" in one call.
 */
export function wirePrioritisedStockReportItem(
  clientId: string,
  priority: string | null,
  priorityOrder: number | null = priority === null ? null : 1,
  overrides: Partial<StockReportItem> = {},
): StockReportItem {
  const base = wireStockReportItem({ client_id: clientId, ...overrides });
  return {
    ...base,
    snapshot: {
      ...base.snapshot!,
      ...overrides.snapshot,
      priority,
      priority_order: priorityOrder,
    },
  };
}

export function wireStockReportVersionCounters(
  overrides: Partial<StockReportVersionProgressCounters> = {},
): StockReportVersionProgressCounters {
  return {
    items_total: 0,
    items_completed: 0,
    quantity_requested: 0,
    quantity_missing: 0,
    quantity_target: 0,
    quantity_in_queue: 0,
    quantity_in_progress: 0,
    quantity_awaiting: 0,
    quantity_resolved: 0,
    quantity_completed: 0,
    ...overrides,
  };
}

/** §6.8 — the handoff's own example numbers by default. */
export function wireStockReportVersionProgress(
  overrides: Partial<StockReportVersionProgress> = {},
): StockReportVersionProgress {
  return {
    ...wireStockReportVersionCounters({
      items_total: 3,
      items_completed: 1,
      quantity_requested: 21,
      quantity_missing: 2,
      quantity_target: 19,
      quantity_in_queue: 3,
      quantity_in_progress: 1,
      quantity_awaiting: 9,
      quantity_resolved: 4,
      quantity_completed: 9,
    }),
    by_priority: {
      high: wireStockReportVersionCounters({
        items_total: 2,
        items_completed: 1,
        quantity_requested: 14,
        quantity_missing: 2,
        quantity_target: 12,
        quantity_in_queue: 3,
        quantity_in_progress: 1,
        quantity_awaiting: 8,
        quantity_resolved: 4,
        quantity_completed: 8,
      }),
      medium: wireStockReportVersionCounters({
        items_total: 1,
        quantity_requested: 7,
        quantity_target: 7,
        quantity_awaiting: 1,
        quantity_completed: 1,
      }),
      low: wireStockReportVersionCounters(),
    },
    ...overrides,
  };
}

export function wireStockReportSnapshotVersion(
  overrides: Partial<StockReportSnapshotVersion> = {},
): StockReportSnapshotVersion {
  return {
    client_id: "srv-1",
    active_at: "2026-09-24T08:00:00+00:00",
    closed_at: null,
    snapshot_count: 12,
    created_at: "2026-09-24T08:00:00+00:00",
    created_by_id: "usr-1",
    closed_by_id: null,
    progress: wireStockReportVersionProgress(),
    ...overrides,
  };
}

export function wireStockReportMissingSummary(
  overrides: Partial<StockReportMissingSummary> = {},
): StockReportMissingSummary {
  return { quantity_missing_total: 0, items_with_missing: 0, ...overrides };
}

export function wireStockReportAssignment(
  overrides: Partial<StockReportAssignment> = {},
): StockReportAssignment {
  return {
    client_id: "sta-1",
    state: "in_queue",
    stock_report_item_id: "sri-1",
    task_id: "tsk-1",
    item_id: "itm-1",
    quantity: 1,
    item: {
      client_id: "itm-1",
      article_number: "0000405",
      sku: null,
      quantity: 1,
      item_category_snapshot: "Dining chair",
      item_major_category_snapshot: "seat",
      item_images: [],
    },
    task: {
      client_id: "tsk-1",
      task_type: "internal",
      priority: "medium",
      state: "pending",
      title: null,
      return_source: null,
      ready_by_at: null,
      return_method: null,
      created_at: "2026-09-22T09:00:00+00:00",
      updated_at: null,
      closed_at: null,
      completed_at: null,
    },
    ...overrides,
  };
}
