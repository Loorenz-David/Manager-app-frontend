import type { TaskListCardProps } from "@beyo/tasks";

import type { FulfilmentQuantities } from "./lib/fulfilment-bar";

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

export type { FulfilmentQuantities, FulfilmentSegments } from "./lib/fulfilment-bar";
