/**
 * Render fixtures for the stock-report screens.
 *
 * They exist so the interface is reviewable and testable before any endpoint is
 * wired: one named fixture per state in `ui_design_documentation/05-ui-states.md`,
 * shaped as the component props rather than as the wire payload. The logic
 * session builds the real values from its view models (§12B B17) and deletes
 * nothing here — the fixtures stay as the component tests' input.
 *
 * Nothing in this file is derived from a response schema; the numbers are the
 * design document's own examples wherever it gave one.
 */

import type {
  StockNeedBucket,
  StockNeedCardData,
  StockReportAssignmentCardData,
} from "../stock-report.types";
import type { StockMatchFailure } from "../api/stock-report-api";
import type { StockMatchFailureRow } from "../lib/stock-match-failure-rows";

/** A stable stand-in for a backend picture URL; no network call is made. */
const CATEGORY_PICTURE = null;

function makeCard(
  stockNeedId: string,
  title: string,
  propertyTags: readonly string[],
  requested: number,
  fulfilled: number,
  inProgress: number,
  inQueue = 0,
): StockNeedCardData {
  return {
    stockNeedId,
    title,
    imageUrl: CATEGORY_PICTURE,
    propertyTags,
    quantities: { requested, fulfilled, inProgress, inQueue },
  };
}

// ---------------------------------------------------------------------------
// A. Fulfilment states (05-ui-states.md §A)
// ---------------------------------------------------------------------------

/** A1 — no progress: the whole track grey. */
export const stockNeedNoProgressFixture = makeCard(
  "need-a1",
  "Low sideboard",
  ["Oak", "Three-door"],
  30,
  0,
  0,
);

/** A2 — partially fulfilled, the design's own 30 / 8 / 4 row. */
export const stockNeedPartiallyFulfilledFixture = makeCard(
  "need-a2",
  "Dining chair",
  ["Oak", "Spindle back"],
  30,
  8,
  4,
);

/** All four segments at once — fulfilled, in progress, in queue, remaining. */
export const stockNeedWithQueueFixture = makeCard(
  "need-queue",
  "Dining chair",
  ["Oak", "Spindle back"],
  30,
  8,
  4,
  6,
);

/** Queued work only: nothing fulfilled, nothing moving yet. */
export const stockNeedQueuedOnlyFixture = makeCard(
  "need-queued-only",
  "Café table",
  ["Beech", "Round"],
  12,
  0,
  0,
  5,
);

/** A3 — work started, nothing fulfilled (the mockup's second list row). */
export const stockNeedWorkStartedFixture = makeCard(
  "need-a3",
  "Dining chair",
  ["Walnut", "Ladder back"],
  16,
  0,
  6,
);

/** A4 — mostly done: a one-piece slice next to a nearly full bar. */
export const stockNeedThinSliceFixture = makeCard(
  "need-a4",
  "Café table",
  ["Beech", "Round"],
  30,
  28,
  1,
);

/** A5 — fully accounted, none delivered: no grey segment left. */
export const stockNeedFullyAccountedFixture = makeCard(
  "need-a5",
  "Armchair",
  ["Walnut", "Curved arm"],
  30,
  20,
  10,
);

/** A6 — complete: blue fills the track. */
export const stockNeedCompleteFixture = makeCard(
  "need-a6",
  "Bar stool",
  ["Ash"],
  12,
  12,
  0,
);

/** A7 — over-fulfilled: the bar clamps, the surplus is invisible. */
export const stockNeedOverFulfilledFixture = makeCard(
  "need-a7",
  "Side table",
  ["Teak", "Square"],
  10,
  12,
  0,
);

/** A stock need with no criteria at all — the tag row disappears entirely. */
export const stockNeedWithoutTagsFixture = makeCard(
  "need-no-tags",
  "Workshop bench",
  [],
  4,
  1,
  0,
);

/** Many long criteria, to prove the tag row wraps rather than truncating. */
export const stockNeedManyTagsFixture = makeCard(
  "need-many-tags",
  "Three-seat sofa with a chaise on the left",
  [
    "Dark / Teak",
    "Curved arm",
    "Buttoned back",
    "Brushed brass feet",
    "Removable cushions",
  ],
  6,
  2,
  1,
);

// ---------------------------------------------------------------------------
// C. Board states (05-ui-states.md §C)
// ---------------------------------------------------------------------------

/** C1 — a bucket with results, in backend order. */
export const stockReportBoardCardsFixture: readonly StockNeedCardData[] = [
  stockNeedPartiallyFulfilledFixture,
  stockNeedWithQueueFixture,
  stockNeedWorkStartedFixture,
  stockNeedThinSliceFixture,
  stockNeedNoProgressFixture,
  stockNeedManyTagsFixture,
];

/** C2 — an empty bucket. */
export const stockReportBoardEmptyFixture: readonly StockNeedCardData[] = [];

/** Every fulfilment state at once, for eyeballing the bar rules side by side. */
export const stockReportBoardAllBarStatesFixture: readonly StockNeedCardData[] =
  [
    stockNeedNoProgressFixture,
    stockNeedPartiallyFulfilledFixture,
    stockNeedWithQueueFixture,
    stockNeedQueuedOnlyFixture,
    stockNeedWorkStartedFixture,
    stockNeedThinSliceFixture,
    stockNeedFullyAccountedFixture,
    stockNeedCompleteFixture,
    stockNeedOverFulfilledFixture,
    stockNeedWithoutTagsFixture,
  ];

/** D1–D3 — the buckets each role is offered (intention §5). */
export const TRIAGE_BUCKETS: readonly StockNeedBucket[] = [
  "unset",
  "high",
  "medium",
  "low",
];
export const WORKER_BUCKETS: readonly StockNeedBucket[] = [
  "high",
  "medium",
  "low",
];

// ---------------------------------------------------------------------------
// E / F. Detail states and assignment cards (05-ui-states.md §E, §F)
// ---------------------------------------------------------------------------

function makeAssignment(
  taskId: string,
  articleNumber: string | null,
  state: StockReportAssignmentCardData["task"]["state"],
  readyByAt: string | null,
  quantity: number,
  imageUrl: string | null = null,
): StockReportAssignmentCardData {
  return {
    taskId,
    task: {
      task_type: "internal",
      state,
      return_source: null,
      ready_by_at: readyByAt,
    },
    item: {
      itemId: `${taskId}-item`,
      article_number: articleNumber,
      sku: articleNumber === null ? "SKU-99120" : null,
      item_major_category_snapshot: "seat",
      quantity,
    },
    imageUrl,
  };
}

/** F1 — a task being worked on, with a quantity badge over the photo. */
export const assignmentWorkingFixture = makeAssignment(
  "task-working",
  "0000808",
  "working",
  new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  4,
);

/** F2 — assigned. */
export const assignmentAssignedFixture = makeAssignment(
  "task-assigned",
  "0000809",
  "assigned",
  new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  2,
);

/** F3 — pending, and F6 — no date emphasis at all. */
export const assignmentPendingFixture = makeAssignment(
  "task-pending",
  "0000810",
  "pending",
  null,
  1,
);

/** F5 — overdue. */
export const assignmentOverdueFixture = makeAssignment(
  "task-overdue",
  "0000811",
  "working",
  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  3,
);

/**
 * An assignment whose state the client does not recognise degrades to the
 * neutral pill rather than blanking the list (intention §8.1). The pill label
 * and variant are supplied by the logic session, which is why they are props.
 */
export const assignmentUnknownStateFixture: StockReportAssignmentCardData = {
  ...makeAssignment("task-unknown", null, "pending", null, 1),
  statePill: { label: "Queued elsewhere", variant: "neutral" },
};

/** E1 — a stock need carrying several items. */
export const stockReportAssignmentsFixture: readonly StockReportAssignmentCardData[] =
  [
    assignmentWorkingFixture,
    assignmentAssignedFixture,
    assignmentPendingFixture,
    assignmentOverdueFixture,
  ];

/** E3 — exactly one item, so the count reads "1 item". */
export const stockReportSingleAssignmentFixture: readonly StockReportAssignmentCardData[] =
  [assignmentWorkingFixture];

/** E2 — no items selected yet. */
export const stockReportNoAssignmentsFixture: readonly StockReportAssignmentCardData[] =
  [];

// ---------------------------------------------------------------------------
// Match preview (intention §8.5, §12A A2)
// ---------------------------------------------------------------------------

/** A category mismatch: nothing to confirm, the item has to change. */
export const stockMatchBlockedReasonFixture =
  "This item is a different category than the stock need asks for.";

/**
 * A property mismatch as the backend reports it — one element per failed
 * criterion, carrying the normalised tokens the matcher compared. All four
 * reasons appear, so anything rendering these covers every branch.
 */
export const stockMatchFailureElementsFixture: readonly StockMatchFailure[] = [
  {
    key: "wood_group",
    reason: "value_not_accepted",
    accepted_values: ["light", "dark"],
    item_values: ["teak"],
  },
  {
    key: "upholstery",
    reason: "missing_on_item",
    accepted_values: ["foam", "synthetic"],
    item_values: [],
  },
  {
    key: "wood_type",
    reason: "no_group_for_value",
    accepted_values: ["light"],
    item_values: ["teak"],
  },
  {
    key: "finish",
    reason: "criterion_not_understood",
    accepted_values: [],
    item_values: [],
  },
];

/**
 * The same four failures as the sheet shows them. Written out rather than
 * derived so a test can hold `toStockMatchFailureRows` to these exact strings;
 * `stock-match-failure-rows.test.ts` asserts the two stay in step.
 */
export const stockMatchFailuresFixture: readonly StockMatchFailureRow[] = [
  {
    key: "wood_group",
    label: "Wood group",
    asked: "Light / Dark",
    item: "Teak",
    reason: "value_not_accepted",
  },
  {
    key: "upholstery",
    label: "Upholstery",
    asked: "Foam / Synthetic",
    item: "—",
    reason: "missing_on_item",
  },
  {
    key: "wood_type",
    label: "Wood type",
    asked: "Light",
    item: "No known group: Teak",
    reason: "no_group_for_value",
  },
  {
    key: "finish",
    label: "Finish",
    asked: "Invalid criterion",
    item: "—",
    reason: "criterion_not_understood",
  },
];
