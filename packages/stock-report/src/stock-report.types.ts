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
import { formatVersionAge } from "./lib/version-age";
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

/**
 * What the board's picker can show. The four priority buckets plus `all` —
 * every active snapshot, prioritised or not, which the backend serves for
 * `priority=all` (owner request, 2026-09-26). `all` is a *board* bucket only:
 * the priority sheet still offers the four `STOCK_NEED_BUCKETS`, because a row
 * cannot be given "all" as a priority. Today only the missing-stock mode
 * offers it (owner, 2026-09-26: the missing page shows All instead of Unset).
 */
export type StockReportBoardBucket = StockNeedBucket | "all";

export const STOCK_NEED_BUCKET_LABEL: Record<StockReportBoardBucket, string> = {
  unset: "Unset",
  all: "All",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * What narrows the board on top of the bucket.
 *
 * `majorCategory: null` means every major category — the request then omits
 * `item_major_categories`. Workers start with their role's category (owner,
 * 2026-09-22); managers and sellers start with none.
 *
 * `missingOnly` is the missing-stock mode (owner, 2026-09-26): the request
 * sends `missing_only=true` and the backend returns only snapshots with
 * `quantity_missing > 0`. It is part of the filter so the two modes never share
 * a cache entry.
 */
export type StockReportListFilter = {
  majorCategory: MajorCategory | null;
  missingOnly: boolean;
};

export const EMPTY_STOCK_REPORT_FILTER: StockReportListFilter = {
  majorCategory: null,
  missingOnly: false,
};

/** Which board a controller drives: the priority board or the missing list. */
export type StockReportBoardMode = "board" | "missing";

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
  /**
   * Whether the row sits in a priority group. The card's bottom button reads
   * "Change priority" for one that does and "Set priority" for one that does
   * not — per card, because the `all` bucket mixes the two.
   */
  hasPriority: boolean;
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
 * `stock_report_improvments/HANDOFF_TO_FRONTEND_stock_report_snapshots_20260926.md`
 * §6, which a backend test keeps in step with the serializers. A field is
 * `.nullable()` only where that table says so; a required field arriving null
 * is a backend regression and should fail loudly here rather than render a
 * fallback.
 */
const NullableString = z.string().nullable();

/**
 * The row's active snapshot (§6.6). `priority` / `priority_order` live here
 * now, not on the row: every version starts unprioritised. `quantity_requested`
 * is frozen at version open; `quantity_awaiting` includes `quantity_resolved`
 * and never goes down because Scanner processed a shelf.
 */
export const StockReportItemSnapshotSchema = z.object({
  client_id: z.string(),
  version_id: z.string(),
  stock_report_item_id: z.string(),
  quantity_requested: z.number(),
  quantity_in_queue: z.number(),
  quantity_in_progress: z.number(),
  quantity_awaiting: z.number(),
  quantity_missing: z.number(),
  quantity_resolved: z.number(),
  // Preserve unknown strings long enough for the mapper to drop only that row
  // instead of rejecting the complete response (B18).
  priority: z.string().nullable(),
  priority_order: z.number().nullable(),
  active_at: z.string(),
  closed_at: NullableString,
  created_at: z.string(),
  updated_at: NullableString,
  updated_by_id: NullableString,
});
export type StockReportItemSnapshot = z.infer<typeof StockReportItemSnapshotSchema>;

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
  properties_signature: z.string(),
  created_at: z.string(),
  updated_at: NullableString,
  created_by_id: NullableString,
  updated_by_id: NullableString,
  // Null only on a `live_stock=true` read of a row with no active snapshot;
  // this client never sends that flag, so a null here is a row the board
  // cannot place and the mapper drops it (§6.1).
  snapshot: StockReportItemSnapshotSchema.nullable(),
});
export type StockReportItem = z.infer<typeof StockReportItemSchema>;

/** The ten counters of §6.8, over one priority group or the whole version. */
const VersionProgressCountersSchema = z.object({
  items_total: z.number(),
  items_completed: z.number(),
  quantity_requested: z.number(),
  quantity_missing: z.number(),
  quantity_target: z.number(),
  quantity_in_queue: z.number(),
  quantity_in_progress: z.number(),
  quantity_awaiting: z.number(),
  quantity_resolved: z.number(),
  quantity_completed: z.number(),
});
export type StockReportVersionProgressCounters = z.infer<
  typeof VersionProgressCountersSchema
>;

/** §6.8 — computed over the version's prioritised snapshots; always present. */
export const StockReportVersionProgressSchema = VersionProgressCountersSchema.extend({
  by_priority: z.object({
    high: VersionProgressCountersSchema,
    medium: VersionProgressCountersSchema,
    low: VersionProgressCountersSchema,
  }),
});
export type StockReportVersionProgress = z.infer<typeof StockReportVersionProgressSchema>;

/** §6.7 plus the `progress` the two version reads add beside it. */
export const StockReportSnapshotVersionSchema = z.object({
  client_id: z.string(),
  active_at: z.string(),
  closed_at: NullableString,
  snapshot_count: z.number(),
  /**
   * `snapshot_count` under the read's `priority` filter (backend
   * `_version_progress.py`, owner 2026-09-26): the snapshots whose progress
   * this payload sums, deleted rows included. It is what every card shows as
   * the version's size; the unfiltered `snapshot_count` is kept but unread.
   */
  filtered_snapshot_count: z.number(),
  created_at: z.string(),
  created_by_id: NullableString,
  closed_by_id: NullableString,
  progress: StockReportVersionProgressSchema,
});
export type StockReportSnapshotVersion = z.infer<typeof StockReportSnapshotVersionSchema>;

/** §5.11 — both counters over the workspace's active snapshots. */
export const StockReportMissingSummarySchema = z.object({
  quantity_missing_total: z.number(),
  items_with_missing: z.number(),
});
export type StockReportMissingSummary = z.infer<typeof StockReportMissingSummarySchema>;

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

/**
 * The board works against the **snapshot**, never the row's live numbers: the
 * frozen `quantity_requested` is the goal the version set out to meet, and the
 * snapshot's `quantity_awaiting` keeps counting units Scanner has already
 * processed (§6.6), so completion never goes backwards on the card.
 *
 * A row without an active snapshot has no place on the board — it was created
 * after the current version opened — and is dropped like an unknown priority.
 */
export function toStockReportItemViewModel(
  item: StockReportItem,
): StockReportItemViewModel | null {
  const snapshot = item.snapshot;
  if (!snapshot) {
    console.warn("[stock-report] dropped row without an active snapshot", item.client_id);
    return null;
  }
  const priority = snapshot.priority;
  if (priority !== null && !STOCK_REPORT_PRIORITY.includes(priority as StockReportPriority)) {
    console.warn("[stock-report] dropped row with unknown priority", item.client_id, priority);
    return null;
  }
  const bucket: StockNeedBucket = (priority as StockReportPriority | null) ?? "unset";
  return {
    ...item,
    bucket,
    card: {
      stockNeedId: item.client_id,
      title: item.item_category.name,
      imageUrl: item.item_category.image_url,
      propertyTags: toStockReportPropertyTags(item.properties),
      quantities: {
        requested: snapshot.quantity_requested,
        fulfilled: snapshot.quantity_awaiting,
        // Owner, 2026-09-22: queued work is its own bar segment. This used to
        // be `in_queue + in_progress` per intention §4.3, which overstated how
        // much was actually moving.
        inProgress: snapshot.quantity_in_progress,
        inQueue: snapshot.quantity_in_queue,
        missing: snapshot.quantity_missing,
      },
      hasPriority: bucket !== "unset",
    },
  };
}

/** One group's share of a version, ready for a progress bar. */
export type StockReportVersionGroupProgress = {
  completed: number;
  target: number;
  /** `completed / target` in percent, or `null` when the group has no snapshot. */
  percent: number | null;
  itemsCompleted: number;
  itemsTotal: number;
  /**
   * The same five numbers a stock-need card draws, so a version bar shows
   * work under way and queued, not only what is done (owner, 2026-09-26: a
   * unit in progress must be visible on the hub card).
   */
  quantities: FulfilmentQuantities;
};

export type StockReportVersionViewModel = StockReportSnapshotVersion & {
  isActive: boolean;
  /** "Started today" / "3 days running" / "Ran 5 days" — see `formatVersionAge`. */
  ageLabel: string;
  totalProgress: StockReportVersionGroupProgress;
  byPriority: Record<StockReportPriority, StockReportVersionGroupProgress>;
};

function toGroupProgress(
  counters: StockReportVersionProgressCounters,
): StockReportVersionGroupProgress {
  const target = Math.max(0, counters.quantity_target);
  const completed = Math.max(0, counters.quantity_completed);
  return {
    completed,
    target,
    // §6.8: the count is completed / target. A group without a snapshot has
    // nothing prioritised — a state to render, not a division. A group whose
    // whole target is missing is 0 of 0, with an amber bar to say why.
    percent:
      target > 0
        ? Math.min(100, (completed / target) * 100)
        : counters.items_total > 0
          ? 0
          : null,
    itemsCompleted: counters.items_completed,
    itemsTotal: counters.items_total,
    quantities: {
      requested: Math.max(0, counters.quantity_requested),
      fulfilled: completed,
      inProgress: Math.max(0, counters.quantity_in_progress),
      inQueue: Math.max(0, counters.quantity_in_queue),
      missing: Math.max(0, counters.quantity_missing),
    },
  };
}

export function toStockReportVersionViewModel(
  version: StockReportSnapshotVersion,
  now: number = Date.now(),
): StockReportVersionViewModel {
  return {
    ...version,
    isActive: version.closed_at === null,
    ageLabel: formatVersionAge(version.active_at, version.closed_at, now),
    totalProgress: toGroupProgress(version.progress),
    byPriority: {
      high: toGroupProgress(version.progress.by_priority.high),
      medium: toGroupProgress(version.progress.by_priority.medium),
      low: toGroupProgress(version.progress.by_priority.low),
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
 *  2. The rest follow the fulfilment bar sitting directly above the list, so a
 *     green segment is backed by green pills. `in_queue` has no task-state
 *     counterpart and is deliberately neutral: it is allocated but static,
 *     not active or accomplished.
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
  // Queued work is static, so keep it neutral rather than implying progress.
  if (state === "in_queue") return { label, variant: "neutral" };
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
