/**
 * The seam between the visual layer and the machinery behind it.
 *
 * Everything in this file is a pure function or a type. No React, no clock, no
 * network. The transform that turns a `production-time` response into one of
 * these view models calls these builders and supplies `nowMs` itself, which is
 * what keeps both sides unit-testable without a backend.
 *
 * Rules inherited from the backend handoff and enforced here:
 *   - the section order is the payload order; nothing in this file sorts;
 *   - `share_state` is the on-track answer — it is passed in, never derived;
 *   - every division by an allowance is guarded, because an allowance can be
 *     zero or negative after a failed pass.
 */

export type ProductionTimeTone =
  | "completed"
  | "working"
  | "paused"
  | "blocked"
  | "pending"
  | "excluded";

/** The server's per-section verdict. Rendered, never recomputed. */
export type ProductionTimeShareState =
  | "on_track"
  | "over_share"
  | "excluded"
  | "no_budget";

export type ProductionTimeRowDetailViewModel = {
  /** 0..100, clamped. 100 when the allowance is zero or negative. */
  progressPercent: number;
  /** 0..100 tick position, or null when the section has no typical yet. */
  typicalMarkerPercent: number | null;
  verdictLabel: string;
  verdictTone: "on_track" | "over_share";
};

export type ProductionTimeRowViewModel = {
  /** `working_section_id`, falling back to the snapshot label plus its index. */
  key: string;
  label: string;
  tone: ProductionTimeTone;
  stateLabel: string;
  /** Live-adjusted while the section is working. */
  workedLabel: string;
  workedSeconds: number;
  /** 2 after a reassignment — the section is still ONE row. */
  stepCount: number;
  isActive: boolean;
  isExcluded: boolean;
  /**
   * "3m allowed" — this section's slice of the item's budget, or null when the
   * task has no budget or the slice is non-positive. Present on **every** row,
   * pending ones included: a manager needs to see a stage is tight before
   * anyone starts it, not once it is already running.
   */
  allowanceLabel: string | null;
  /** "typical 1h 0m", or null when the section has no typical yet. */
  typicalLabel: string | null;
  /** "of typically 50m" — the degraded, budget-less row line. */
  typicalComparisonLabel: string | null;
  /** Non-null only for an active row on a task that has a budget. */
  detail: ProductionTimeRowDetailViewModel | null;
};

export type ProductionTimeSegmentViewModel = {
  key: string;
  tone: ProductionTimeTone;
  widthPercent: number;
};

export type ProductionTimeHeadlineViewModel = {
  workedLabel: string;
  /** Already includes the preposition: "of 3h 15m". Null when there is no budget. */
  budgetLabel: string | null;
  remainingLabel: string | null;
  isOverBudget: boolean;
  /** The headline came from `final` — the task is closed and the numbers are frozen. */
  isFinal: boolean;
};

export type ProductionTimeCardViewModel = {
  headline: ProductionTimeHeadlineViewModel;
  segments: ProductionTimeSegmentViewModel[];
  /** Hatched tail. 0 once the budget is fully consumed. */
  remainderPercent: number;
  rows: ProductionTimeRowViewModel[];
};

export type ProductionTimeNoBudgetViewModel = {
  /** Summed from the rows — `budget.actual_worker_seconds` is null here. */
  workedLabel: string;
  /** Names the missing thing, never the status code. */
  reasonTitle: string;
  reasonBody: string;
  /** The literal status value, surfaced as a title attribute for support only. */
  rawStatus: string;
  cta: { label: string; kind: "commit" | "valuation" } | null;
  rows: ProductionTimeRowViewModel[];
};

export type ProductionTimeViewModel =
  | { kind: "budget"; card: ProductionTimeCardViewModel }
  | { kind: "no_budget"; card: ProductionTimeNoBudgetViewModel }
  | { kind: "unavailable"; reason: "detached" | "mismatched" };

/**
 * "3m allowed · typical 5m" — the budget line under a row. Either half may be
 * missing; both missing renders nothing rather than an empty separator.
 */
export function buildBudgetLine(
  allowanceLabel: string | null,
  typicalLabel: string | null,
): string | null {
  const parts = [allowanceLabel, typicalLabel].filter(
    (part): part is string => part !== null,
  );

  return parts.length === 0 ? null : parts.join(" · ");
}

/** Rows shown before the "Show all" toggle is used. */
export const PRODUCTION_TIME_COLLAPSED_ROW_COUNT = 4;

/**
 * "2h 55m" above the hour, "50m" below it. Negative input reads as "0m" —
 * a negative duration is never a thing to show a user, and the over-budget
 * case is phrased separately by the headline.
 */
export function formatWorkSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "0m";
  }

  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

/**
 * The headline bar: the budget, filled by each section's actual worked time and
 * coloured by that section's state, with the unconsumed remainder as the tail.
 *
 * Once the sections have worked past the budget there is no remainder to draw,
 * so the widths normalise against the total worked instead — the bar stays full
 * and the "over" figure carries the overrun.
 */
export function buildSegments(
  rows: ReadonlyArray<
    Pick<ProductionTimeRowViewModel, "key" | "tone" | "workedSeconds">
  >,
  budgetSeconds: number,
): { segments: ProductionTimeSegmentViewModel[]; remainderPercent: number } {
  const totalWorked = rows.reduce(
    (sum, row) => sum + Math.max(0, row.workedSeconds),
    0,
  );
  const denominator = Math.max(budgetSeconds, totalWorked);

  if (denominator <= 0) {
    return { segments: [], remainderPercent: 0 };
  }

  // A zero-width segment still costs a flex gap, which reads as a stray sliver.
  const segments = rows
    .filter((row) => row.workedSeconds > 0)
    .map((row) => ({
      key: row.key,
      tone: row.tone,
      widthPercent: (row.workedSeconds / denominator) * 100,
    }));

  const remainderSeconds = denominator - totalWorked;
  const remainderPercent =
    remainderSeconds > 0 ? (remainderSeconds / denominator) * 100 : 0;

  return { segments, remainderPercent };
}

/**
 * Geometry for an active row's inner bar. The verdict is the server's
 * `share_state` passed straight through — this function never compares worked
 * time to the allowance to decide whether a section is on track.
 *
 * A non-positive allowance draws a full over-share bar rather than dividing:
 * a section whose failed pass already ate its whole slice is legitimately at or
 * below zero.
 */
export function buildRowDetail(
  workedSeconds: number,
  allowanceSeconds: number | null,
  typicalSeconds: number | null,
  shareState: ProductionTimeShareState,
): ProductionTimeRowDetailViewModel {
  const isOverShare = shareState === "over_share";
  const verdictLabel = isOverShare ? "Over share" : "On track";
  const verdictTone = isOverShare ? "over_share" : "on_track";

  if (allowanceSeconds === null || allowanceSeconds <= 0) {
    return {
      progressPercent: 100,
      typicalMarkerPercent: null,
      verdictLabel,
      verdictTone,
    };
  }

  return {
    progressPercent: clampPercent((workedSeconds / allowanceSeconds) * 100),
    typicalMarkerPercent:
      typicalSeconds === null || typicalSeconds <= 0
        ? null
        : clampPercent((typicalSeconds / allowanceSeconds) * 100),
    verdictLabel,
    verdictTone,
  };
}

/**
 * A section the task visited more than once — a reassignment. The row stays a
 * single row summing every pass, so the count is what tells a reader that the
 * time beside it covers more than one stretch of work.
 *
 * Returns null for the ordinary single-pass case, which is most rows.
 */
export function formatPassCount(stepCount: number): string | null {
  if (!Number.isFinite(stepCount) || stepCount <= 1) {
    return null;
  }

  return `${Math.floor(stepCount)} passes`;
}

/**
 * Collapsed, the card shows the first few rows plus every active row — the
 * stage being worked right now is the most useful line on the card and must
 * never be the one hidden behind the toggle. Payload order is preserved either
 * way.
 */
export function selectVisibleRows(
  rows: readonly ProductionTimeRowViewModel[],
  isExpanded: boolean,
): ProductionTimeRowViewModel[] {
  if (isExpanded || rows.length <= PRODUCTION_TIME_COLLAPSED_ROW_COUNT) {
    return [...rows];
  }

  const visible = new Set<number>();

  for (let index = 0; index < PRODUCTION_TIME_COLLAPSED_ROW_COUNT; index += 1) {
    visible.add(index);
  }

  rows.forEach((row, index) => {
    if (row.isActive) {
      visible.add(index);
    }
  });

  return rows.filter((_row, index) => visible.has(index));
}

/**
 * A section's `state` is the task-step vocabulary, confirmed with backend. The
 * value arrives pre-aggregated — a reassigned section reports its later, active
 * step, and two steps of one section never run at once — so this maps the field
 * as received and never derives a state from steps.
 *
 * Anything unrecognised degrades to a neutral row rather than throwing.
 */
export function stateToTone(state: string | null | undefined): ProductionTimeTone {
  switch (state) {
    case "completed":
      return "completed";
    case "working":
      return "working";
    case "paused":
    case "ended_shift":
      return "paused";
    case "blocked":
    case "failed":
      return "blocked";
    default:
      return "pending";
  }
}

/** "ended_shift" → "Ended shift". */
export function humanizeSectionState(
  state: string | null | undefined,
): string {
  if (!state) {
    return "";
  }

  const withSpaces = state.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
