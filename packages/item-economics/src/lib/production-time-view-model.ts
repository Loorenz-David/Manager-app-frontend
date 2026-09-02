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

import type { TypicalStrategyViewModel } from "./typical-strategy";

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
  /** 0..100, clamped. 100 when the effective pressure target is exhausted. */
  progressPercent: number;
  positionLabel: string;
  positionTone: "neutral" | "over";
  /** Backend verdict retained for semantic progress and metric styling. */
  verdictTone: "on_track" | "over_share";
};

export type ProductionTimeMetricViewModel = {
  label: string;
  valueLabel: string;
  supportingLabel: string | null;
  tone: "neutral" | "success" | "danger";
};

export type ProductionTimeRowMetricsViewModel = readonly [
  ProductionTimeMetricViewModel,
  ProductionTimeMetricViewModel,
  ProductionTimeMetricViewModel,
];

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
  /** Working, paused, and ended-shift rows retain the expanded treatment. */
  isActive: boolean;
  /** Completed, skipped, failed, and cancelled rows show performance metrics. */
  isTerminal: boolean;
  isExcluded: boolean;
  /**
   * Compact fallback copy for pending/blocked rows. Active and terminal rows
   * use their structured metric grids instead.
   */
  allowanceLabel: string | null;
  /** "pressure 43m" — the server's live, un-clamped open-work share. */
  pressureLabel: string | null;
  /** "typical 2m/pc" — per piece, or null when the section has no typical yet. */
  typicalLabel: string | null;
  /**
   * "of typically 50m" — the degraded, budget-less row line. Whole-order, not
   * per piece: it is read directly against `workedLabel` beside it, which is
   * the time the whole order has taken.
   */
  typicalComparisonLabel: string | null;
  /**
   * The served per-piece median, quantity-independent. The number every
   * "Typical" on the row displays, and null exactly when there is no typical.
   */
  unitTypicalSeconds: number | null;
  /**
   * The same typical scaled to this task's quantity, as served. Not displayed
   * anywhere today except the comparison line — kept on the row so the
   * whole-order reading can be offered without re-deriving it, which the
   * handoff forbids doing client-side.
   */
  projectedTypicalSeconds: number | null;
  /** Budget / Variance / Typical, only for terminal rows on budgeted tasks. */
  terminalMetrics: ProductionTimeRowMetricsViewModel | null;
  /** Budget / Pressure-or-Over-budget / Typical for active and pending rows. */
  activeMetrics: ProductionTimeRowMetricsViewModel | null;
  /** Non-null only for an active row on a task that has a budget. */
  detail: ProductionTimeRowDetailViewModel | null;
};

export type ProductionTimeSegmentViewModel = {
  key: string;
  tone: ProductionTimeTone;
  widthPercent: number;
};

/**
 * The money reading of the same three figures, shown when the headline is
 * tapped. Deliberately the same shape as the time side: the two are one row in
 * two units, and anything that renders one must be able to render the other.
 */
export type ProductionTimeHeadlineCostViewModel = {
  workedLabel: string;
  /** "of 2 540 kr". Null when the pot itself was not served. */
  budgetLabel: string | null;
  remainingLabel: string | null;
  isOverBudget: boolean;
};

export type ProductionTimeHeadlineViewModel = {
  workedLabel: string;
  /** Already includes the preposition: "of 3h 15m". Null when there is no budget. */
  budgetLabel: string | null;
  remainingLabel: string | null;
  isOverBudget: boolean;
  /** The headline came from `final` — the task is closed and the numbers are frozen. */
  isFinal: boolean;
  /**
   * Null disables the tap entirely: this role was served no money, or the task
   * is closed and its frozen time must not be paired with live cost.
   */
  cost: ProductionTimeHeadlineCostViewModel | null;
};

/**
 * The forecast line under the bar: the unfinished sections' own targets no
 * longer fit in what is left of the task pot.
 *
 * This is the one figure on the card the backend does not serve. It is a
 * *projection*, deliberately phrased as one, and it is not a verdict: the
 * served `share_state` and the served remaining minutes are still rendered
 * exactly as received, and nothing here feeds back into them.
 */
export type ProductionTimeOutlookViewModel = {
  /** "~43m expected left · ~16m over budget" */
  label: string;
  /** Sum of the unfinished sections' own remaining targets. */
  remainingCommitmentSeconds: number;
  /** How much that overshoots the task's remaining pot. Always positive. */
  projectedOverrunSeconds: number;
};

/**
 * The banner above the headline on an `infeasible` task: there is no time to
 * divide because the item's non-labour costs already consume the sale price.
 *
 * The sentence is split so the amount can be emphasised without the renderer
 * having to parse copy back out of a string.
 */
export type ProductionTimeNoticeSegment = {
  text: string;
  /** A served figure, emphasised in the rendering. */
  emphasis: boolean;
};

export type ProductionTimeInfeasibleNoticeViewModel = {
  title: string;
  /** The sentence in order, so the renderer never parses copy back out of a string. */
  body: readonly ProductionTimeNoticeSegment[];
};

export type ProductionTimeCardViewModel = {
  headline: ProductionTimeHeadlineViewModel;
  /** What every "Typical" on this card was measured over. */
  strategy: TypicalStrategyViewModel;
  /** Non-null only for `infeasible` — the task has no pot to divide at all. */
  infeasibleNotice: ProductionTimeInfeasibleNoticeViewModel | null;
  segments: ProductionTimeSegmentViewModel[];
  /** Hatched tail. 0 once the budget is fully consumed. */
  remainderPercent: number;
  /** Null whenever the remaining work still fits, or the task is closed. */
  outlook: ProductionTimeOutlookViewModel | null;
  rows: ProductionTimeRowViewModel[];
};

export type ProductionTimeNoBudgetViewModel = {
  /** Same disclosure: a budget-less card still shows typicals. */
  strategy: TypicalStrategyViewModel;
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
  pressureLabel: string | null,
  typicalLabel: string | null,
): string | null {
  const parts = [allowanceLabel, pressureLabel, typicalLabel].filter(
    (part): part is string => part !== null,
  );

  return parts.length === 0 ? null : parts.join(" · ");
}

/** Rows the collapsed scroll viewport shows at once. */
export const PRODUCTION_TIME_VIEWPORT_ROW_COUNT = 3;

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

/** Marks a figure as per-piece rather than whole-order. */
export const PRODUCTION_TIME_UNIT_SUFFIX = "pc";

/**
 * Per-piece durations are an order of magnitude smaller than the whole-order
 * figures `formatWorkSeconds` was written for, where flooring to the minute
 * costs nothing. Here it does: a 45-second unit typical would read "0m", which
 * a reader cannot tell apart from missing data, and the served value is the one
 * genuinely fractional figure in the payload. So this rounds instead of
 * flooring and keeps seconds below the hour.
 */
export function formatUnitWorkSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "0s";
  }

  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  // Above the hour the seconds are noise against the minutes beside them.
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
  }

  return `${remainder}s`;
}

/** "2m/pc" — a per-piece duration carrying its marker inline. */
export function formatUnitWorkLabel(seconds: number): string {
  return `${formatUnitWorkSeconds(seconds)}/${PRODUCTION_TIME_UNIT_SUFFIX}`;
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

function normalizedSeconds(seconds: number): number {
  return Math.max(0, seconds);
}

/**
 * Pressure is allowed to tighten an active section, never loosen it beyond
 * the original assignment. Null means pressure is not applicable.
 */
export function capPressureSeconds(
  allowanceSeconds: number | null,
  pressureSeconds: number | null,
): number | null {
  if (pressureSeconds === null) {
    return null;
  }

  const pressure = normalizedSeconds(pressureSeconds);
  return allowanceSeconds === null
    ? pressure
    : Math.min(normalizedSeconds(allowanceSeconds), pressure);
}

export function metricValueLabel(seconds: number | null): string {
  return seconds === null ? "-" : formatWorkSeconds(normalizedSeconds(seconds));
}

/**
 * The Typical tile, in per-piece seconds.
 *
 * The two tiles beside it — Budget, and Variance or Pressure — are whole-order,
 * so this one carries the "pc" marker in its supporting slot. Without it the
 * grid reads as three comparable figures and a single-piece typical next to a
 * whole-order budget looks like an enormous underrun.
 */
export function buildTypicalMetric(
  unitTypicalSeconds: number | null,
): ProductionTimeMetricViewModel {
  return {
    label: "Typical",
    valueLabel:
      unitTypicalSeconds === null
        ? "-"
        : formatUnitWorkSeconds(normalizedSeconds(unitTypicalSeconds)),
    supportingLabel:
      unitTypicalSeconds === null ? null : PRODUCTION_TIME_UNIT_SUFFIX,
    tone: "neutral",
  };
}

export function buildTerminalMetrics(
  workedSeconds: number,
  allowanceSeconds: number | null,
  unitTypicalSeconds: number | null,
): ProductionTimeRowMetricsViewModel {
  const budgetSeconds =
    allowanceSeconds === null ? null : normalizedSeconds(allowanceSeconds);
  let variance: ProductionTimeMetricViewModel = {
    label: "Variance",
    valueLabel: "-",
    supportingLabel: null,
    tone: "neutral",
  };

  if (budgetSeconds !== null) {
    const differenceSeconds = normalizedSeconds(workedSeconds) - budgetSeconds;

    if (differenceSeconds > 0) {
      variance = {
        label: "Variance",
        valueLabel: `+${formatWorkSeconds(differenceSeconds)}`,
        supportingLabel: "over budget",
        tone: "danger",
      };
    } else if (differenceSeconds < 0) {
      variance = {
        label: "Variance",
        valueLabel: formatWorkSeconds(-differenceSeconds),
        supportingLabel: "under budget",
        tone: "success",
      };
    } else {
      variance = {
        label: "Variance",
        valueLabel: "0m",
        supportingLabel: "on budget",
        tone: "success",
      };
    }
  }

  return [
    {
      label: "Budget",
      valueLabel: metricValueLabel(budgetSeconds),
      supportingLabel: null,
      tone: "neutral",
    },
    variance,
    buildTypicalMetric(unitTypicalSeconds),
  ];
}

export function buildActiveMetrics(
  allowanceSeconds: number | null,
  pressureSeconds: number | null,
  unitTypicalSeconds: number | null,
  leftSeconds: number | null,
  shareState: ProductionTimeShareState,
): ProductionTimeRowMetricsViewModel {
  const middleMetric: ProductionTimeMetricViewModel =
    shareState === "over_share"
      ? {
          label: "Over budget",
          valueLabel:
            leftSeconds !== null && leftSeconds < 0
              ? formatWorkSeconds(-leftSeconds)
              : "-",
          supportingLabel: null,
          tone: "danger",
        }
      : {
          label: "Pressure",
          valueLabel: metricValueLabel(
            capPressureSeconds(allowanceSeconds, pressureSeconds),
          ),
          supportingLabel: null,
          tone: "neutral",
        };

  return [
    {
      label: "Budget",
      valueLabel: metricValueLabel(allowanceSeconds),
      supportingLabel: null,
      tone: "neutral",
    },
    middleMetric,
    buildTypicalMetric(unitTypicalSeconds),
  ];
}

/**
 * Geometry and position copy for an active row. Remaining/over time and the
 * progress denominator use the capped pressure target. Once the backend says
 * the original assignment is exceeded, its served `left_seconds` owns the
 * overflow amount so a zero pressure target does not count all worked time as
 * budget overrun. The verdict remains the backend's `share_state`.
 */
export function buildRowDetail(
  workedSeconds: number,
  allowanceSeconds: number | null,
  pressureSeconds: number | null,
  leftSeconds: number | null,
  shareState: ProductionTimeShareState,
): ProductionTimeRowDetailViewModel {
  const isOverShare = shareState === "over_share";
  const verdictTone = isOverShare ? "over_share" : "on_track";
  const cappedPressureSeconds = capPressureSeconds(
    allowanceSeconds,
    pressureSeconds,
  );
  const targetSeconds =
    cappedPressureSeconds ??
    (allowanceSeconds === null ? null : normalizedSeconds(allowanceSeconds));

  const isOverAssignedBudget = leftSeconds !== null && leftSeconds < 0;

  if (targetSeconds === null && !isOverAssignedBudget) {
    return {
      progressPercent: 0,
      positionLabel: "-",
      positionTone: "neutral",
      verdictTone,
    };
  }

  const differenceSeconds =
    targetSeconds === null
      ? null
      : targetSeconds - normalizedSeconds(workedSeconds);
  const isOverTarget = differenceSeconds !== null && differenceSeconds < 0;
  const positionLabel = isOverAssignedBudget
    ? `${formatWorkSeconds(-leftSeconds)} over`
    : isOverTarget
      ? `${formatWorkSeconds(-(differenceSeconds ?? 0))} over`
      : `${formatWorkSeconds(differenceSeconds ?? 0)} left`;
  const positionTone =
    isOverAssignedBudget || isOverTarget ? "over" : "neutral";

  if (targetSeconds === null || targetSeconds <= 0) {
    return {
      progressPercent: 100,
      positionLabel,
      positionTone,
      verdictTone,
    };
  }

  return {
    progressPercent: clampPercent(
      (normalizedSeconds(workedSeconds) / targetSeconds) * 100,
    ),
    positionLabel,
    positionTone,
    verdictTone,
  };
}

/** Sections that will not consume any more of the pot. */
const SETTLED_SECTION_STATES = new Set([
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);

/**
 * Below this the sentence is noise: `formatWorkSeconds` floors to minutes, so
 * a smaller gap would announce itself as "0m over".
 */
export const PRODUCTION_TIME_OUTLOOK_MIN_OVERRUN_SECONDS = 60;

export type ProductionTimeOutlookInput = {
  state: string | null | undefined;
  /** The section's own `left_seconds`, as served. */
  leftSeconds: number | null;
};

/**
 * Compares what the unfinished sections are still budgeted for against what is
 * left of the task pot, and speaks up only when the first no longer fits in
 * the second.
 *
 * Why the two can disagree at all: the split is static — the property the
 * `static_proportional_section_*` family is named for, and which the v2
 * item-aware release changed the weights of but not. Each section's slice is
 * fixed at evaluation time and an overrun in one section is never redistributed out of
 * another's — deliberately, so a stage's target stays a stable number its
 * worker can hit rather than one that shrinks because an earlier stage ran
 * long. The consequence is this card can show every remaining stage a
 * comfortable target while the task as a whole is already committed to
 * finishing over budget. That gap is what this line names.
 *
 * A section already past its own slice contributes nothing rather than a
 * negative: how far it will *keep* overrunning is not knowable, and letting it
 * subtract would quietly cancel out another stage's real remaining work.
 */
export function buildOutlook(
  sections: readonly ProductionTimeOutlookInput[],
  remainingSeconds: number | null,
): ProductionTimeOutlookViewModel | null {
  if (remainingSeconds === null) {
    return null;
  }

  const remainingCommitmentSeconds = sections.reduce((sum, section) => {
    if (
      section.leftSeconds === null ||
      SETTLED_SECTION_STATES.has(section.state ?? "")
    ) {
      return sum;
    }

    return sum + Math.max(0, section.leftSeconds);
  }, 0);

  if (remainingCommitmentSeconds <= 0) {
    return null;
  }

  const projectedOverrunSeconds = remainingCommitmentSeconds - remainingSeconds;

  if (projectedOverrunSeconds < PRODUCTION_TIME_OUTLOOK_MIN_OVERRUN_SECONDS) {
    return null;
  }

  return {
    label: `~${formatWorkSeconds(
      remainingCommitmentSeconds,
    )} expected left · ~${formatWorkSeconds(
      projectedOverrunSeconds,
    )} over budget`,
    remainingCommitmentSeconds,
    projectedOverrunSeconds,
  };
}

// Swedish grouping, fixed rather than device-derived: the figure is in the
// workspace's currency regardless of the phone's locale. `production-time`
// serves no currency field (handoff §"Response shape"), so the suffix is the
// workspace's.
//
// Rounded to the whole krona: this card's figures are a quick on-track/
// over-budget read, not a ledger, so öre are dropped — unlike the
// budget-signal footer in `task-budget-overrun.ts`, which keeps them.
const productionCostFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Integer minor units (öre) → "1 385 kr", rounded to the nearest krona.
 * Display only.
 *
 * The space before the suffix is a non-breaking one, as is the group separator
 * sv-SE already emits: the amount is a single token and must never be split
 * across lines mid-sentence, least of all leaving a bare "kr" on the next one.
 */
export function formatProductionCostMinor(minor: number): string {
  return `${productionCostFormatter.format(minor / 100)}\u00a0kr`;
}

/**
 * The headline's money side, straight from the served trio. Nothing is derived
 * from seconds and a rate, and nothing is clamped: a negative pot is the whole
 * point of `infeasible` and reads as a negative budget here too.
 *
 * Returns null — which is what removes the tap affordance — whenever the cost
 * of the worked time was not served, the case for every worker and seller
 * session, since the money keys are absent from those bodies entirely.
 */
export function buildHeadlineCost(
  productionBudgetMinor: number | null | undefined,
  consumedCostMinor: number | null | undefined,
  varianceCostMinor: number | null | undefined,
): ProductionTimeHeadlineCostViewModel | null {
  if (typeof consumedCostMinor !== "number") {
    return null;
  }

  const hasVariance = typeof varianceCostMinor === "number";

  return {
    workedLabel: formatProductionCostMinor(consumedCostMinor),
    budgetLabel:
      typeof productionBudgetMinor === "number"
        ? `of ${formatProductionCostMinor(productionBudgetMinor)}`
        : null,
    remainingLabel: !hasVariance
      ? null
      : varianceCostMinor < 0
        ? `${formatProductionCostMinor(-varianceCostMinor)} over`
        : `${formatProductionCostMinor(varianceCostMinor)} left`,
    // The served sign is the verdict — `variance_cost_minor < 0` *is* the
    // overflow signal (handoff §3), never a comparison we make ourselves.
    isOverBudget: hasVariance && varianceCostMinor < 0,
  };
}

const INFEASIBLE_NOTICE_TITLE = "No time budget to allocate";
const INFEASIBLE_NOTICE_TAIL = ", so there is nothing left for labour.";

/**
 * Explains an `infeasible` task before the reader tries to make sense of the
 * figures under it. The status means exactly `allowed_worker_minutes <= 0`: the
 * item's other costs consumed the sale price, so the division had nothing to
 * hand out and every section's slice is legitimately 0m.
 *
 * Both figures are served, not derived. The shortfall is `production_budget_minor`
 * negated — a negative pot *is* the shortfall — and its time equivalent is
 * `allowed_worker_minutes` negated, which is that same money divided by the
 * evaluation's rate on the server. Naming the second is what makes the headline
 * add up: the over-figure there counts this shortfall *plus* the work actually
 * done, so without it a reader sees "1h 7m worked, 1h 46m over" and no way to
 * reconcile the two.
 *
 * Each figure drops out on its own terms — money whenever the role was served
 * none (worker and seller bodies carry no money keys), time whenever the pot
 * landed at exactly zero, where there is no shortfall to name in either unit.
 */
export function buildInfeasibleNotice(
  productionBudgetMinor: number | null | undefined,
  allowedWorkerSeconds: number | null,
): ProductionTimeInfeasibleNoticeViewModel {
  const shortfallMinor =
    typeof productionBudgetMinor === "number" && productionBudgetMinor < 0
      ? -productionBudgetMinor
      : null;
  const shortfallSeconds =
    allowedWorkerSeconds !== null && allowedWorkerSeconds < 0
      ? -allowedWorkerSeconds
      : null;

  if (shortfallMinor !== null) {
    return {
      title: INFEASIBLE_NOTICE_TITLE,
      body: [
        { text: "Costs already exceed the sale price by ", emphasis: false },
        { text: formatProductionCostMinor(shortfallMinor), emphasis: true },
        ...(shortfallSeconds === null
          ? []
          : [
              { text: " (about ", emphasis: false },
              { text: formatWorkSeconds(shortfallSeconds), emphasis: true },
              { text: " of work)", emphasis: false },
            ]),
        { text: INFEASIBLE_NOTICE_TAIL, emphasis: false },
      ],
    };
  }

  // Money-free, for the roles served no money: the time equivalent says the
  // same thing in the unit they do get, so the sentence keeps its figure.
  if (shortfallSeconds !== null) {
    return {
      title: INFEASIBLE_NOTICE_TITLE,
      body: [
        {
          text: "Costs already exceed the sale price by about ",
          emphasis: false,
        },
        { text: formatWorkSeconds(shortfallSeconds), emphasis: true },
        { text: ` of work${INFEASIBLE_NOTICE_TAIL}`, emphasis: false },
      ],
    };
  }

  return {
    title: INFEASIBLE_NOTICE_TITLE,
    body: [
      {
        text: `Costs already take up the whole sale price${INFEASIBLE_NOTICE_TAIL}`,
        emphasis: false,
      },
    ],
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
 * The row the collapsed viewport scrolls to on its own, so the reader never
 * hunts for the live stage. Priority, in payload (production) order:
 *
 *   1. the oldest working section;
 *   2. else the oldest paused one (ended-shift reads as paused);
 *   3. else the last completed one — the pipeline's frontier;
 *   4. else the top.
 */
export function selectAnchorRowIndex(
  rows: readonly Pick<ProductionTimeRowViewModel, "tone">[],
): number {
  const firstWorking = rows.findIndex((row) => row.tone === "working");
  if (firstWorking !== -1) {
    return firstWorking;
  }

  const firstPaused = rows.findIndex((row) => row.tone === "paused");
  if (firstPaused !== -1) {
    return firstPaused;
  }

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]!.tone === "completed") {
      return index;
    }
  }

  return 0;
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
