import type Decimal from "decimal.js";
import { formatDateTime } from "@beyo/tasks";

import type {
  InventoryHistoryBucketKey,
  InventoryHistoryBuckets,
  InventoryHistoryChildRecord,
  InventoryHistoryIntegrity,
  InventoryHistoryPage,
  InventoryHistoryRecord,
  InventoryHistoryTask,
} from "../history-types";
import { formatMeters, toDecimal } from "./decimal";

/**
 * Pure presenters for the inventory change-history timeline. Nothing here
 * knows about React or the query layer.
 */

export type HistoryDeltaChip = {
  bucket: InventoryHistoryBucketKey;
  /** e.g. "Stored −3 m" */
  label: string;
  sign: "positive" | "negative";
};

export type HistoryBadgeKind = "reconstructed" | "clamped" | "chain_break";

export type HistoryBadge = {
  kind: HistoryBadgeKind;
  label: string;
  /** Secondary explanation (the anomaly text for "clamped"). */
  detail: string | null;
};

export type HistoryTaskView = {
  taskId: string;
  label: string;
  isDeleted: boolean;
};

export type HistoryRecordDescription = {
  id: string;
  title: string;
  actorLabel: string;
  timeLabel: string;
  task: HistoryTaskView | null;
  /** "Available → In use" for the requirement transition carried by the row. */
  requirementLabel: string | null;
  /** Allocation facts, e.g. "Pool 12 m · 2 resolved · 1 still waiting". */
  detailsLabel: string | null;
  note: string | null;
  chips: HistoryDeltaChip[];
  badges: HistoryBadge[];
};

export type HistoryDriftBanner = {
  title: string;
  message: string;
  chips: HistoryDeltaChip[];
};

const MINUS = "−";

const BUCKET_LABELS: Record<InventoryHistoryBucketKey, string> = {
  stored: "Stored",
  in_use: "In use",
  in_need: "Needed",
  ordered: "Ordered",
  total_used: "Used total",
  total_used_inventory: "Used from stock",
  total_used_surplus: "Used from surplus",
  total_surplus: "Surplus total",
};

/**
 * Buckets shown as chips on an entry. The two `total_used_*` buckets are a
 * breakdown of `total_used` and would only repeat it.
 */
const ENTRY_CHIP_BUCKETS: InventoryHistoryBucketKey[] = [
  "stored",
  "in_use",
  "in_need",
  "ordered",
  "total_used",
  "total_surplus",
];

const DRIFT_CHIP_BUCKETS: InventoryHistoryBucketKey[] = [
  "stored",
  "in_use",
  "in_need",
  "ordered",
  "total_used",
  "total_used_inventory",
  "total_used_surplus",
  "total_surplus",
];

const REQUIREMENT_STATE_LABELS: Record<string, string> = {
  missing_quantity: "Missing quantity",
  available: "Available",
  needs_ordering: "Needs ordering",
  ordered: "Ordered",
  in_use: "In use",
  completed: "Completed",
  failed: "Failed",
};

const ANOMALY_LABELS: Record<string, string> = {
  in_need_clamped_at_zero: "Needed amount would have gone below 0 and was kept at 0",
};

export function humanize(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim();
  if (!words) return value;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

export function formatRequirementState(state: string): string {
  return REQUIREMENT_STATE_LABELS[state] ?? humanize(state);
}

function formatAbsMeters(value: Decimal): string {
  return formatMeters(value.abs().toString()) ?? "0 m";
}

/** "+3 m" / "−3 m" / "0 m". */
export function formatSignedMeters(value: string | null): string | null {
  const decimal = toDecimal(value);
  if (!decimal) return null;
  if (decimal.isZero()) return formatAbsMeters(decimal);
  return `${decimal.isNegative() ? MINUS : "+"}${formatAbsMeters(decimal)}`;
}

function bucketChips(
  buckets: InventoryHistoryBuckets | null,
  keys: InventoryHistoryBucketKey[],
  { signed = true }: { signed?: boolean } = {},
): HistoryDeltaChip[] {
  if (!buckets) return [];

  const chips: HistoryDeltaChip[] = [];
  for (const bucket of keys) {
    const decimal = toDecimal(buckets[bucket]);
    if (!decimal || decimal.toDecimalPlaces(3).isZero()) continue;

    chips.push({
      bucket,
      label: `${BUCKET_LABELS[bucket]} ${
        signed ? formatSignedMeters(buckets[bucket]) : formatAbsMeters(decimal)
      }`,
      sign: decimal.isNegative() ? "negative" : "positive",
    });
  }
  return chips;
}

/**
 * Non-zero bucket deltas, e.g. "Stored −3 m", "In use +3 m". An opening
 * balance has no predecessor, so it shows its starting totals unsigned.
 */
export function getHistoryDeltaChips(
  record: Pick<InventoryHistoryChildRecord, "delta" | "after" | "movement_type">,
): HistoryDeltaChip[] {
  if (record.movement_type === "opening_balance" && !record.delta) {
    return bucketChips(record.after, ENTRY_CHIP_BUCKETS, { signed: false });
  }
  return bucketChips(record.delta, ENTRY_CHIP_BUCKETS);
}

export function getHistoryActorLabel(
  record: Pick<InventoryHistoryChildRecord, "created_by" | "is_reconstructed">,
): string {
  const username = record.created_by?.username;
  if (username) return username;
  if (record.is_reconstructed && !record.created_by) {
    return "Unknown (reconstructed)";
  }
  return "System";
}

export function formatHistoryTask(task: InventoryHistoryTask): HistoryTaskView {
  const title = task.title?.trim();
  return {
    taskId: task.client_id,
    label: title ? `#${task.task_scalar_id} ${title}` : `#${task.task_scalar_id}`,
    isDeleted: task.is_deleted,
  };
}

function withAmount(label: string, amount: string | null): string {
  const formatted = formatMeters(amount);
  return formatted ? `${label} (${formatted})` : label;
}

function absAmount(value: string | null): string | null {
  const decimal = toDecimal(value);
  return decimal ? decimal.abs().toString() : null;
}

function requirementTransitionLabel(
  record: Pick<InventoryHistoryChildRecord, "requirement">,
): string | null {
  const requirement = record.requirement;
  if (!requirement?.to_state) return null;

  const to = formatRequirementState(requirement.to_state);
  if (!requirement.from_state || requirement.from_state === requirement.to_state) {
    return `→ ${to}`;
  }
  return `${formatRequirementState(requirement.from_state)} → ${to}`;
}

function needAdjustedTitle(record: InventoryHistoryChildRecord): string {
  const quantity = toDecimal(record.quantity_meters);
  const amount = absAmount(record.quantity_meters);

  switch (record.trigger) {
    case "task_deleted":
      return "Task deleted, need released";
    case "task_finished":
      return "Task finished, unordered need released";
    case "upholstery_swapped":
      return "Upholstery swapped, need released";
    case "item_upholstery_deleted":
      return "Upholstery removed from item, need released";
    default:
      break;
  }

  if (quantity && !quantity.isZero()) {
    const formatted = formatMeters(amount);
    return quantity.isNegative()
      ? `Need reduced by ${formatted}`
      : `Need increased by ${formatted}`;
  }
  return "Need adjusted";
}

function needAddedTitle(record: InventoryHistoryChildRecord): string {
  switch (record.trigger) {
    case "task_created":
      return "Needed for task";
    case "task_restored":
      return "Task restored, need added again";
    case "item_upholstery_set":
      return "Upholstery set on item";
    case "upholstery_swapped":
      return "Upholstery swapped to this fabric";
    case "requirement_quantity_changed":
      return withAmount("Need increased", absAmount(record.quantity_meters));
    default:
      return withAmount("Need added", absAmount(record.quantity_meters));
  }
}

function orderAmount(record: InventoryHistoryChildRecord, kind: "placed" | "received") {
  if (record.quantity_meters) return absAmount(record.quantity_meters);
  const order = record.upholstery_order;
  if (!order) return null;
  return kind === "placed" ? order.order_amount_meters : order.received_amount_meters;
}

function allocationRunTitle(trigger: string): string {
  switch (trigger) {
    case "requirements_marked_ordered":
      return "Requirements marked as ordered";
    case "requirements_resolved_after_stock":
      return "Requirements resolved from stock";
    case "stock_reallocated":
      return "Stock re-allocated";
    default:
      return "Requirements re-allocated";
  }
}

export function getHistoryRecordTitle(record: InventoryHistoryChildRecord): string {
  switch (record.movement_type) {
    case "opening_balance":
      return "Opening balance (history starts here)";
    case "inventory_created":
      return "Inventory created";
    case "need_added":
      return needAddedTitle(record);
    case "need_adjusted":
      return needAdjustedTitle(record);
    case "reserved_for_use":
      return "Reserved for production";
    case "use_finished":
      return "Used in production";
    case "used_direct":
      return withAmount("Used directly from stock", absAmount(record.quantity_meters));
    case "use_rolled_back":
      return "Production use rolled back";
    case "order_placed":
      return withAmount(
        record.trigger === "manual_add_ordered"
          ? "Ordered amount added manually"
          : "Order placed",
        orderAmount(record, "placed"),
      );
    case "order_received":
      return withAmount(
        record.trigger === "manual_confirm_ordered"
          ? "Ordered amount moved to stock"
          : "Order received",
        orderAmount(record, "received"),
      );
    case "order_amount_changed": {
      // quantity_meters is the signed delta of the order's amount.
      const quantity = toDecimal(record.quantity_meters);
      if (!quantity || quantity.isZero()) return "Order amount changed";
      const formatted = formatMeters(absAmount(record.quantity_meters));
      return quantity.isNegative()
        ? `Order reduced by ${formatted}`
        : `Order increased by ${formatted}`;
    }
    case "surplus_added":
      return withAmount("Surplus added", absAmount(record.quantity_meters));
    case "stored_set": {
      const value = formatMeters(record.quantity_meters ?? record.after?.stored ?? null);
      return value ? `Stored amount set to ${value}` : "Stored amount set";
    }
    case "allocation_run":
      return allocationRunTitle(record.trigger);
    case "requirement_state_changed":
      return requirementTransitionLabel(record) ?? "Requirement state changed";
    default:
      return humanize(record.movement_type);
  }
}

export function getHistoryBadges(
  record: Pick<
    InventoryHistoryChildRecord,
    "is_reconstructed" | "anomaly" | "chain_break"
  >,
): HistoryBadge[] {
  const badges: HistoryBadge[] = [];

  if (record.is_reconstructed) {
    badges.push({ kind: "reconstructed", label: "Reconstructed", detail: null });
  }
  if (record.anomaly) {
    badges.push({
      kind: "clamped",
      label: "Clamped",
      detail: ANOMALY_LABELS[record.anomaly] ?? humanize(record.anomaly),
    });
  }
  if (record.chain_break) {
    badges.push({
      kind: "chain_break",
      label: "Unrecorded change before this",
      detail: null,
    });
  }

  return badges;
}

function idCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

export function getHistoryDetailsLabel(
  details: Record<string, unknown> | null,
): string | null {
  if (!details) return null;

  const parts: string[] = [];
  const pool = details.pool_meters;
  if (typeof pool === "string" || typeof pool === "number") {
    const formatted = formatMeters(String(pool));
    if (formatted) parts.push(`Pool ${formatted}`);
  }

  const resolved = idCount(details.resolved_requirement_ids);
  if (resolved !== null) parts.push(`${resolved} resolved`);

  const unresolved = idCount(details.unresolved_requirement_ids);
  if (unresolved !== null) parts.push(`${unresolved} still waiting`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function describeHistoryRecord(
  record: InventoryHistoryChildRecord,
): HistoryRecordDescription {
  const isStateChange = record.movement_type === "requirement_state_changed";

  return {
    id: record.client_id,
    title: getHistoryRecordTitle(record),
    actorLabel: getHistoryActorLabel(record),
    timeLabel: formatDateTime(record.created_at),
    task: record.task ? formatHistoryTask(record.task) : null,
    // A state-change row already uses the transition as its title.
    requirementLabel: isStateChange ? null : requirementTransitionLabel(record),
    detailsLabel: getHistoryDetailsLabel(record.details),
    note: record.note?.trim() || null,
    chips: getHistoryDeltaChips(record),
    badges: getHistoryBadges(record),
  };
}

/**
 * Flattens infinite-query pages into one list, keeping the server order and
 * the first occurrence of each `client_id` (keyset pages should not overlap,
 * but a refetch racing a "show more" must never render a row twice).
 */
export function flattenHistoryPages(
  pages: InventoryHistoryPage[],
): InventoryHistoryRecord[] {
  const seen = new Set<string>();
  const records: InventoryHistoryRecord[] = [];

  for (const page of pages) {
    for (const record of page.records) {
      if (seen.has(record.client_id)) continue;
      seen.add(record.client_id);
      records.push(record);
    }
  }

  return records;
}

export function getHistoryDriftBanner(
  integrity: InventoryHistoryIntegrity | null,
): HistoryDriftBanner | null {
  if (!integrity || integrity.status !== "drift") return null;

  return {
    title: "Totals differ from the recorded history",
    message:
      "The current totals don't match what the recorded changes add up to. Something changed them outside the app's recorded actions.",
    chips: bucketChips(integrity.drift, DRIFT_CHIP_BUCKETS),
  };
}
