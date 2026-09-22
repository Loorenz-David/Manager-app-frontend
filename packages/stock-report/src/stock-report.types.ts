import {
  TASK_STATE,
  TASK_STATE_VARIANT,
  TASK_TYPE,
  type TaskListCardProps,
  type TaskState,
  type TaskType,
} from "@beyo/tasks";

import type { MajorCategory } from "@beyo/lib";
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
 * What the filter sheet narrows the board by, on top of the bucket. `null`
 * means every major category — the request then omits `item_major_categories`.
 * Workers start with their role's category (owner, 2026-09-22); managers and
 * sellers start with none.
 */
export type StockReportListFilter = { majorCategory: MajorCategory | null };

export const EMPTY_STOCK_REPORT_FILTER: StockReportListFilter = {
  majorCategory: null,
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

/*
 * Nullability follows the field tables of
 * `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_20260922.md` §6, which
 * a backend test keeps in step with the serializers. A field is `.nullable()`
 * only where that table says so; a required field arriving null is a backend
 * regression and should fail loudly here rather than render a fallback.
 */
const NullableString = z.string().nullable();

export const StockReportItemSchema = z.object({
  client_id: z.string(),
  item_category: z.object({
    client_id: z.string(),
    name: z.string(),
    major_category: z.string(),
    // The key is always present; null when the category has no picture.
    image_url: NullableString,
  }),
  // Scanner controls the criteria values and the backend normaliser passes
  // through anything it does not recognise (wiring guide W-1). Validating the
  // values here would let one odd criterion fail the whole list parse and
  // blank the board, so each value is checked in `toStockReportPropertyTags`
  // and an odd one costs only its tag — the same rule B18 applies to `priority`.
  properties: z.record(z.string(), z.unknown()),
  quantity_requested: z.number(),
  quantity_in_queue: z.number(),
  quantity_in_progress: z.number(),
  quantity_awaiting: z.number(),
  // Preserve unknown strings long enough for the mapper to drop only that row
  // instead of rejecting the complete response (B18).
  priority: z.string().nullable(),
  priority_order: z.number().nullable(),
});
export type StockReportItem = z.infer<typeof StockReportItemSchema>;

const StockReportAssignmentItemSchema = z.object({
  client_id: z.string(),
  article_number: NullableString,
  sku: NullableString,
  quantity: z.number(),
  item_category_snapshot: NullableString,
  item_major_category_snapshot: NullableString,
  // Possibly empty, never null (§6.3). The element shape is not pinned by a
  // table, so it stays lenient.
  item_images: z.array(
    z.object({
      client_id: z.string().nullable().optional(),
      image_url: z.string().nullable().optional(),
    }),
  ),
});

const StockReportAssignmentTaskSchema = z.object({
  client_id: z.string(),
  task_type: z.string(),
  priority: z.string(),
  state: z.string(),
  title: NullableString,
  return_source: NullableString,
  ready_by_at: NullableString,
  return_method: NullableString,
  created_at: z.string(),
  updated_at: NullableString,
  closed_at: NullableString,
  completed_at: NullableString,
});

export const StockReportAssignmentSchema = z.object({
  client_id: z.string(),
  // One of six states (§6.5); an unknown one degrades to a neutral pill.
  state: z.string(),
  stock_report_item_id: z.string(),
  task_id: z.string(),
  item_id: z.string(),
  quantity: z.number(),
  item: StockReportAssignmentItemSchema,
  task: StockReportAssignmentTaskSchema,
});
export type StockReportAssignment = z.infer<typeof StockReportAssignmentSchema>;

export type StockReportItemViewModel = StockReportItem & {
  card: StockNeedCardData;
  bucket: StockNeedBucket;
};

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b([a-z])/g, (letter: string) => letter.toUpperCase());
}

/**
 * The one way this feature turns a criterion's normalised value tokens into
 * display text. The board's property tags and the match warning's comparison
 * both read it, so `Light / Dark` on a card and `Light / Dark` in the sheet are
 * the same string by construction rather than by two authors agreeing.
 */
export function formatStockPropertyValues(
  values: readonly string[],
): string {
  return values.map(titleCase).join(" / ");
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

/**
 * Converts Scanner criteria into the exact display tags owned by this feature.
 * The normalised form is `string[]` per key; any other value is Scanner noise
 * the backend let through and is skipped, never thrown on (wiring guide W-1).
 */
export function toStockReportPropertyTags(
  properties: StockReportItem["properties"],
): readonly string[] {
  return Object.entries(properties).flatMap(([key, values]) =>
    isStringList(values) && values.length > 0
      ? [`${titleCase(key)}: ${formatStockPropertyValues(values)}`]
      : [],
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
      title: item.item_category.name,
      imageUrl: item.item_category.image_url,
      propertyTags: toStockReportPropertyTags(item.properties),
      quantities: {
        requested: item.quantity_requested,
        fulfilled: item.quantity_awaiting,
        // Owner, 2026-09-22: queued work is its own bar segment. This used to
        // be `in_queue + in_progress` per intention §4.3, which overstated how
        // much was actually moving.
        inProgress: item.quantity_in_progress,
        inQueue: item.quantity_in_queue,
      },
    },
  };
}

function toTaskType(value: string): TaskType {
  return TASK_TYPE.includes(value as TaskType) ? (value as TaskType) : "internal";
}

function toTaskState(value: string): TaskState {
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
 * Anything unrecognised stays neutral — the deliberate degrade from intention
 * §8.1, which keeps an unknown state from blanking the list.
 */
/**
 * What each assignment state is called on the card.
 *
 * The wording matches the fulfilment bar's legend, so a row and the segment it
 * belongs to are named the same thing. `awaiting` is the one that needed
 * translating: it is the backend's word for stock that has been produced and is
 * waiting to be taken up, which is exactly what the bar counts as **fulfilled**
 * (owner, 2026-09-22). Showing "Awaiting" beside a green bar segment labelled
 * "Fulfilled" invited the reader to think they were different things.
 */
const ASSIGNMENT_STATE_LABEL: Record<string, string> = {
  in_queue: "In queue",
  in_progress: "In progress",
  awaiting: "Fulfilled",
  resolved: "Resolved",
  resolved_early: "Resolved early",
  failed: "Failed",
};

function assignmentStatePill(state: string): NonNullable<TaskListCardProps["statePill"]> {
  // An unrecognised state still gets a readable label rather than raw snake
  // case — it is unknown to this build, not necessarily to the user.
  const label = ASSIGNMENT_STATE_LABEL[state] ?? state.replaceAll("_", " ");
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
  const { item, task } = assignment;
  return {
    taskId: assignment.task_id,
    task: {
      task_type: toTaskType(task.task_type),
      state: toTaskState(task.state),
      return_source: task.return_source as TaskListCardProps["task"]["return_source"],
      ready_by_at: task.ready_by_at,
    },
    item: {
      itemId: item.client_id,
      article_number: item.article_number,
      sku: item.sku,
      item_major_category_snapshot: item.item_major_category_snapshot,
      quantity: item.quantity,
    },
    imageUrl: item.item_images[0]?.image_url ?? null,
    statePill: assignmentStatePill(assignment.state),
  };
}

export type { FulfilmentQuantities, FulfilmentSegments } from "./lib/fulfilment-bar";
