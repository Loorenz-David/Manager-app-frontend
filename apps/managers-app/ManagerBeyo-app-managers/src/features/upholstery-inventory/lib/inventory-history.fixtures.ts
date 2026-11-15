import type {
  InventoryHistoryBuckets,
  InventoryHistoryChildRecord,
  InventoryHistoryPage,
  InventoryHistoryRecord,
} from "../history-types";

/** Test-only builders for history wire data (already parsed shape). */

export function buckets(
  overrides: Partial<InventoryHistoryBuckets> = {},
): InventoryHistoryBuckets {
  return {
    stored: "0.000",
    in_use: "0.000",
    in_need: "0.000",
    ordered: "0.000",
    total_used: "0.000",
    total_used_inventory: "0.000",
    total_used_surplus: "0.000",
    total_surplus: "0.000",
    ...overrides,
  };
}

export function childRecord(
  overrides: Partial<InventoryHistoryChildRecord> = {},
): InventoryHistoryChildRecord {
  return {
    client_id: "uih_child",
    movement_type: "requirement_state_changed",
    trigger: "order_received",
    created_at: "2026-11-10T09:30:00+00:00",
    is_reconstructed: false,
    created_by: null,
    quantity_meters: null,
    before: null,
    after: null,
    delta: null,
    requirement: null,
    task: null,
    task_resolution: null,
    item: null,
    upholstery_order: null,
    anomaly: null,
    note: null,
    details: null,
    chain_break: false,
    ...overrides,
  };
}

export function historyRecord(
  overrides: Partial<InventoryHistoryRecord> = {},
): InventoryHistoryRecord {
  return {
    ...childRecord({ movement_type: "stored_set", trigger: "manual_stored_set" }),
    client_id: "uih_parent",
    children: [],
    ...overrides,
  };
}

export function historyPage(
  overrides: Partial<InventoryHistoryPage> = {},
): InventoryHistoryPage {
  return {
    records: [],
    integrity: null,
    pagination: { limit: 20, has_more: false, next_cursor: null },
    ...overrides,
  };
}
