import type { TaskListCardProps } from "@beyo/tasks";

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

export const StockReportAssignmentSchema = z.object({
  client_id: z.string(),
  state: z.string().nullable().optional(),
  stock_report_item_id: z.string(),
  task_id: z.string(),
  item_id: z.string().nullable().optional(),
  quantity: NullishNumber,
  item: z.unknown().nullable().optional(),
  task: z.unknown().nullable().optional(),
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
        inProgress: displayNumber(item.quantity_in_queue) + displayNumber(item.quantity_in_progress),
      },
    },
  };
}

export type { FulfilmentQuantities, FulfilmentSegments } from "./lib/fulfilment-bar";
