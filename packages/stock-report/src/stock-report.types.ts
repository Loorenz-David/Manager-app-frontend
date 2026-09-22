import {
  TASK_STATE,
  TASK_STATE_VARIANT,
  TASK_TYPE,
  type TaskListCardProps,
  type TaskState,
  type TaskType,
} from "@beyo/tasks";

import type { FulfilmentQuantities } from "./lib/fulfilment-bar";
import { z } from "zod";

/**
 * The buckets the board shows, one at a time. `unset` is *not* "all" — it is
 * the bucket of stock needs with no priority assigned (intention §8.3: the
 * request omits the `priority` parameter for it).
 *
 * An `as const` object rather than a TS `enum`: the packages compile with
 * `erasableSyntaxOnly` (§12B B17).
 */
export const STOCK_NEED_BUCKETS = ["unset", "high", "medium", "low"] as const;

export type StockNeedBucket = (typeof STOCK_NEED_BUCKETS)[number];

export const STOCK_NEED_BUCKET_LABEL: Record<StockNeedBucket, string> = {
  unset: "Unset",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Everything one board row needs to render. The logic session builds these from
 * its `StockReportItemViewModel` (§12B B17) — this package never sees a DTO.
 */
export type StockNeedCardData = {
  /** The stock need's `client_id`; also the drag id and the testid suffix. */
  stockNeedId: string;
  /** The item category's name — the card title and the detail page title. */
  title: string;
  /** The item category's own picture. `null` renders the placeholder. */
  imageUrl: string | null;
  /**
   * Already-formatted criteria labels, in the order they should read. This
   * package never formats criteria — the mapping from `properties` to tag text
   * is the logic session's (intention §4.1).
   */
  propertyTags: readonly string[];
  quantities: FulfilmentQuantities;
};

/**
 * One assignment row on the detail page. The shape is borrowed from
 * `TaskListCard` itself so the two cannot drift: the assignment list renders
 * that card from `@beyo/tasks` as-is (intention §6.2).
 */
export type StockReportAssignmentCardData = Pick<
  TaskListCardProps,
  "taskId" | "task" | "item" | "imageUrl" | "statePill"
>;

/**
 * Every list surface in this package reports the same three conditions, so the
 * views can branch once and the logic session has one thing to map onto.
 */
export type StockReportLoadStatus = "loading" | "error" | "ready";

export const STOCK_REPORT_PRIORITY = ["high", "medium", "low"] as const;
export type StockReportPriority = (typeof STOCK_REPORT_PRIORITY)[number];

const NullishString = z.string().nullable().optional();
const NullishNumber = z.number().nullable().optional();

export const StockReportItemSchema = z.object({
  client_id: z.string(),
  item_category: z.object({
    client_id: z.string(),
    name: NullishString,
    major_category: NullishString,
    image_url: NullishString,
  }).nullable().optional(),
  properties: z.record(z.string(), z.array(z.string()).nullable()).nullable().optional(),
  quantity_requested: NullishNumber,
  quantity_in_queue: NullishNumber,
  quantity_in_progress: NullishNumber,
  quantity_awaiting: NullishNumber,
  // Preserve unknown strings long enough for the mapper to drop only that row
  // instead of rejecting the complete response (B18).
  priority: z.string().nullable().optional(),
  priority_order: NullishNumber,
});
export type StockReportItem = z.infer<typeof StockReportItemSchema>;

const StockReportAssignmentItemSchema = z.object({
  client_id: z.string().nullable().optional(),
  article_number: NullishString,
  sku: NullishString,
  quantity: NullishNumber,
  item_category_snapshot: NullishString,
  item_major_category_snapshot: NullishString,
  item_images: z.array(z.object({ client_id: z.string().nullable().optional(), image_url: NullishString })).nullable().optional(),
}).nullable().optional();

const StockReportAssignmentTaskSchema = z.object({
  client_id: z.string().nullable().optional(),
  task_type: NullishString,
  priority: NullishString,
  state: NullishString,
  title: NullishString,
  return_source: NullishString,
  ready_by_at: NullishString,
  return_method: NullishString,
  created_at: NullishString,
  updated_at: NullishString,
  closed_at: NullishString,
  completed_at: NullishString,
}).nullable().optional();

export const StockReportAssignmentSchema = z.object({
  client_id: z.string(),
  state: z.string().nullable().optional(),
  stock_report_item_id: z.string(),
  task_id: z.string(),
  item_id: z.string().nullable().optional(),
  quantity: NullishNumber,
  item: StockReportAssignmentItemSchema,
  task: StockReportAssignmentTaskSchema,
});
export type StockReportAssignment = z.infer<typeof StockReportAssignmentSchema>;

export type StockReportItemViewModel = StockReportItem & {
  card: StockNeedCardData;
  bucket: StockNeedBucket;
};

function displayNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b([a-z])/g, (letter: string) => letter.toUpperCase());
}

/** Converts Scanner criteria into the exact display tags owned by this feature. */
export function toStockReportPropertyTags(
  properties: StockReportItem["properties"],
): readonly string[] {
  if (!properties) return [];
  return Object.entries(properties).flatMap(([key, values]) =>
    values === null ? [] : [`${titleCase(key)}: ${values.map(titleCase).join(" / ")}`],
  );
}

export function toStockReportItemViewModel(
  item: StockReportItem,
): StockReportItemViewModel | null {
  const priority = item.priority;
  if (priority !== undefined && priority !== null && !STOCK_REPORT_PRIORITY.includes(priority as StockReportPriority)) {
    console.warn("[stock-report] dropped row with unknown priority", item.client_id, priority);
    return null;
  }
  const bucket: StockNeedBucket = (priority as StockReportPriority | null | undefined) ?? "unset";
  return {
    ...item,
    bucket,
    card: {
      stockNeedId: item.client_id,
      title: item.item_category?.name ?? "Stock need",
      imageUrl: item.item_category?.image_url ?? null,
      propertyTags: toStockReportPropertyTags(item.properties),
      quantities: {
        requested: displayNumber(item.quantity_requested),
        fulfilled: displayNumber(item.quantity_awaiting),
        // Owner, 2026-09-22: queued work is its own bar segment. This used to
        // be `in_queue + in_progress` per intention §4.3, which overstated how
        // much was actually moving.
        inProgress: displayNumber(item.quantity_in_progress),
        inQueue: displayNumber(item.quantity_in_queue),
      },
    },
  };
}

function toTaskType(value: string | null | undefined): TaskType {
  return TASK_TYPE.includes(value as TaskType) ? (value as TaskType) : "internal";
}

function toTaskState(value: string | null | undefined): TaskState {
  return TASK_STATE.includes(value as TaskState) ? (value as TaskState) : "pending";
}

/**
 * An assignment's state, not its task's — `TaskListCard` renders whichever
 * `statePill` it is given, and on this page that is the assignment.
 *
 * Owner, 2026-09-22. Two rules decide the colour:
 *
 *  1. A state with an obvious task-state counterpart borrows its variant from
 *     `TASK_STATE_VARIANT` rather than picking one, so the same work cannot
 *     read one way here and another on the task page — and a later change to
 *     the task palette carries over by itself. `awaiting` counts as completed
 *     and rides with the two resolved states.
 *  2. The rest match the fulfilment bar sitting directly above the list, so a
 *     green segment is backed by green pills. `in_queue` has no task-state
 *     counterpart, so it takes the bar's amber directly.
 *
 * Anything unrecognised, or absent, stays neutral — the deliberate degrade from
 * intention §8.1, which keeps an unknown state from blanking the list.
 */
function assignmentStatePill(state: string | null | undefined): NonNullable<TaskListCardProps["statePill"]> {
  const label = state?.replaceAll("_", " ") ?? "Unknown";
  if (state === "failed") return { label, variant: "danger" };
  if (state === "resolved" || state === "resolved_early" || state === "awaiting") {
    return { label, variant: TASK_STATE_VARIANT.ready };
  }
  if (state === "in_progress") return { label, variant: TASK_STATE_VARIANT.working };
  // Matches the bar's in-queue segment; no task state means "queued".
  if (state === "in_queue") return { label, variant: "warning" };
  return { label, variant: "neutral" };
}

/** Maps the verified compact assignment/task payload onto TaskListCard's API. */
export function toStockReportAssignmentCardData(
  assignment: StockReportAssignment,
): StockReportAssignmentCardData {
  const item = assignment.item;
  const task = assignment.task;
  return {
    taskId: assignment.task_id,
    task: {
      task_type: toTaskType(task?.task_type),
      state: toTaskState(task?.state),
      return_source: task?.return_source as TaskListCardProps["task"]["return_source"],
      ready_by_at: task?.ready_by_at ?? null,
    },
    item: item
      ? {
          itemId: item.client_id ?? assignment.item_id ?? null,
          article_number: item.article_number ?? null,
          sku: item.sku ?? null,
          item_major_category_snapshot: item.item_major_category_snapshot ?? null,
          quantity: displayNumber(item.quantity ?? assignment.quantity),
        }
      : null,
    imageUrl: item?.item_images?.[0]?.image_url ?? null,
    statePill: assignmentStatePill(assignment.state),
  };
}

export type { FulfilmentQuantities, FulfilmentSegments } from "./lib/fulfilment-bar";
