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
  /** 0..100, clamped. 100 when the effective pressure target is exhausted. */
  progressPercent: number;
  positionLabel: string;
  positionTone: "neutral" | "over";
  verdictLabel: string;
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
  /** "typical 1h 0m", or null when the section has no typical yet. */
  typicalLabel: string | null;
  /** "of typically 50m" — the degraded, budget-less row line. */
  typicalComparisonLabel: string | null;
  /** Budget / Variance / Typical, only for terminal rows on budgeted tasks. */
  terminalMetrics: ProductionTimeRowMetricsViewModel | null;
  /** Budget / Pressure-or-Over-budget / Typical for active budgeted rows. */
  activeMetrics: ProductionTimeRowMetricsViewModel | null;
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
  /** "Remaining work is budgeted at 43m — projected ~16m over." */
  label: string;
  /** Sum of the unfinished sections' own remaining targets. */
  remainingCommitmentSeconds: number;
  /** How much that overshoots the task's remaining pot. Always positive. */
  projectedOverrunSeconds: number;
};

export type ProductionTimeCardViewModel = {
  headline: ProductionTimeHeadlineViewModel;
  segments: ProductionTimeSegmentViewModel[];
  /** Hatched tail. 0 once the budget is fully consumed. */
  remainderPercent: number;
  /** Null whenever the remaining work still fits, or the task is closed. */
  outlook: ProductionTimeOutlookViewModel | null;
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
  pressureLabel: string | null,
  typicalLabel: string | null,
): string | null {
  const parts = [allowanceLabel, pressureLabel, typicalLabel].filter(
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

export function buildTerminalMetrics(
  workedSeconds: number,
  allowanceSeconds: number | null,
  typicalSeconds: number | null,
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
    {
      label: "Typical",
      valueLabel: metricValueLabel(typicalSeconds),
      supportingLabel: null,
      tone: "neutral",
    },
  ];
}

export function buildActiveMetrics(
  allowanceSeconds: number | null,
  pressureSeconds: number | null,
  typicalSeconds: number | null,
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
    {
      label: "Typical",
      valueLabel: metricValueLabel(typicalSeconds),
      supportingLabel: null,
      tone: "neutral",
    },
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
  const verdictLabel = isOverShare ? "OVER BUDGET" : "ON TRACK";
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
      verdictLabel,
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
      verdictLabel,
      verdictTone,
    };
  }

  return {
    progressPercent: clampPercent(
      (normalizedSeconds(workedSeconds) / targetSeconds) * 100,
    ),
    positionLabel,
    positionTone,
    verdictLabel,
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
    label: `Remaining work is budgeted at ${formatWorkSeconds(
      remainingCommitmentSeconds,
    )} — projected ~${formatWorkSeconds(projectedOverrunSeconds)} over.`,
    remainingCommitmentSeconds,
    projectedOverrunSeconds,
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
