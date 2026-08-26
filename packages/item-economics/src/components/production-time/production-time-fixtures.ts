/**
 * Render fixtures for the production-time widget.
 *
 * These exist so the visual layer is reviewable and testable before the
 * endpoint ships. The little `makeRow` / `makeBudgetCard` helpers below mirror
 * what the real DTO transform will do, but they take plain numbers rather than
 * the response shape — the actual `toProductionTimeViewModel` belongs to the
 * logic track and parses the payload proper.
 */

import {
  buildActiveMetrics,
  buildOutlook,
  buildRowDetail,
  buildSegments,
  buildTerminalMetrics,
  formatWorkSeconds,
  humanizeSectionState,
  stateToTone,
  type ProductionTimeCardViewModel,
  type ProductionTimeNoBudgetViewModel,
  type ProductionTimeRowViewModel,
  type ProductionTimeShareState,
  type ProductionTimeViewModel,
} from "../../lib/production-time-view-model";

type RowInput = {
  key: string;
  label: string;
  state: string;
  workedSeconds: number;
  stepCount?: number;
  allowanceSeconds?: number | null;
  pressureSeconds?: number | null;
  typicalSeconds?: number | null;
  shareState?: ProductionTimeShareState;
};

function makeRow(input: RowInput, hasBudget: boolean): ProductionTimeRowViewModel {
  const shareState = input.shareState ?? "on_track";
  const isActive = ["working", "paused", "ended_shift"].includes(input.state);
  const isTerminal = ["completed", "skipped", "failed", "cancelled"].includes(
    input.state,
  );
  const isExcluded = shareState === "excluded";
  const typicalSeconds = input.typicalSeconds ?? null;
  const leftSeconds =
    input.allowanceSeconds === null || input.allowanceSeconds === undefined
      ? null
      : input.allowanceSeconds - input.workedSeconds;

  return {
    key: input.key,
    label: input.label,
    tone: isExcluded ? "excluded" : stateToTone(input.state),
    stateLabel: humanizeSectionState(input.state),
    workedLabel: formatWorkSeconds(input.workedSeconds),
    workedSeconds: input.workedSeconds,
    stepCount: input.stepCount ?? 1,
    isActive,
    isTerminal,
    isExcluded,
    allowanceLabel:
      input.allowanceSeconds === null || input.allowanceSeconds === undefined || input.allowanceSeconds <= 0
        ? null
        : `${formatWorkSeconds(input.allowanceSeconds)} allowed`,
    pressureLabel: null,
    typicalLabel:
      typicalSeconds === null
        ? null
        : `typical ${formatWorkSeconds(typicalSeconds)}`,
    typicalComparisonLabel:
      typicalSeconds === null
        ? null
        : `of typically ${formatWorkSeconds(typicalSeconds)}`,
    terminalMetrics:
      isTerminal && hasBudget
        ? buildTerminalMetrics(
            input.workedSeconds,
            input.allowanceSeconds ?? null,
            typicalSeconds,
          )
        : null,
    activeMetrics:
      isActive && hasBudget && !isExcluded
        ? buildActiveMetrics(
            input.allowanceSeconds ?? null,
            input.pressureSeconds ?? null,
            typicalSeconds,
            leftSeconds,
            shareState,
          )
        : null,
    detail:
      isActive && hasBudget && !isExcluded
        ? buildRowDetail(
            input.workedSeconds,
            input.allowanceSeconds ?? null,
            input.pressureSeconds ?? null,
            leftSeconds,
            shareState,
          )
        : null,
  };
}

function makeBudgetCard(
  inputs: RowInput[],
  budgetSeconds: number,
  options: { isFinal?: boolean } = {},
): ProductionTimeCardViewModel {
  const rows = inputs.map((input) => makeRow(input, true));
  const totalWorked = rows.reduce((sum, row) => sum + row.workedSeconds, 0);
  const remainingSeconds = budgetSeconds - totalWorked;
  const { segments, remainderPercent } = buildSegments(rows, budgetSeconds);
  const isFinal = options.isFinal ?? false;
  const outlook = isFinal
    ? null
    : buildOutlook(
        inputs.map((input) => ({
          state: input.state,
          leftSeconds:
            input.allowanceSeconds === null ||
            input.allowanceSeconds === undefined
              ? null
              : input.allowanceSeconds - input.workedSeconds,
        })),
        remainingSeconds,
      );

  return {
    headline: {
      workedLabel: formatWorkSeconds(totalWorked),
      budgetLabel: `of ${formatWorkSeconds(budgetSeconds)}`,
      remainingLabel:
        remainingSeconds >= 0
          ? `${formatWorkSeconds(remainingSeconds)} left`
          : `${formatWorkSeconds(-remainingSeconds)} over`,
      isOverBudget: remainingSeconds < 0,
      isFinal,
    },
    segments,
    remainderPercent,
    outlook,
    rows,
  };
}

const MOCKUP_ROWS: RowInput[] = [
  {
    key: "wsec-structural",
    label: "Structural Repair",
    state: "completed",
    workedSeconds: 4200,
    allowanceSeconds: 4500,
    typicalSeconds: 4200,
  },
  {
    key: "wsec-sanding",
    label: "Sanding",
    state: "completed",
    workedSeconds: 3000,
    allowanceSeconds: 3000,
    typicalSeconds: 3000,
  },
  {
    key: "wsec-finishing",
    label: "Finishing",
    state: "paused",
    workedSeconds: 900,
    allowanceSeconds: 1800,
    pressureSeconds: 1800,
    typicalSeconds: 1800,
  },
  {
    key: "wsec-upholstery",
    label: "Upholstery",
    state: "working",
    workedSeconds: 2400,
    allowanceSeconds: 3900,
    pressureSeconds: 3300,
    typicalSeconds: 3600,
  },
];

/** The approved mockup: 2h 55m of 3h 15m, 20m left, Upholstery in progress. */
export const productionTimeMockupFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(MOCKUP_ROWS, 11_700),
};

/**
 * Five stages — the exact point at which the row list starts truncating.
 * Collapsed this shows four rows and the toggle; nothing is hidden but the
 * last stage.
 */
export const productionTimeFiveStageFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      ...MOCKUP_ROWS,
      {
        key: "wsec-polishing",
        label: "Polishing",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 900,
        typicalSeconds: 900,
      },
    ],
    11_700,
  ),
};

/** Six stages — two rows now sit behind the toggle. */
export const productionTimeSixStageFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      ...MOCKUP_ROWS,
      {
        key: "wsec-polishing",
        label: "Polishing",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 900,
        typicalSeconds: 900,
      },
      {
        key: "wsec-delivery-prep",
        label: "Delivery Prep",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 600,
        typicalSeconds: 600,
      },
    ],
    11_700,
  ),
};

/** Worked past the budget — full bar, no hatched tail, "over" in the danger tone. */
export const productionTimeOverBudgetFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      { ...MOCKUP_ROWS[0], workedSeconds: 5400 },
      { ...MOCKUP_ROWS[1], workedSeconds: 4200 },
      {
        ...MOCKUP_ROWS[3],
        workedSeconds: 4800,
        allowanceSeconds: 3900,
        pressureSeconds: 3300,
        shareState: "over_share",
      },
    ],
    11_700,
  ),
};

/**
 * A section visited twice (one row, summed, ×2) alongside one whose every step
 * ended skipped or cancelled, and one whose failed pass ate its whole slice —
 * the allowance is non-positive, so its bar must not divide.
 */
export const productionTimeEdgeCasesFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      { ...MOCKUP_ROWS[0], workedSeconds: 4200, stepCount: 2 },
      {
        key: "wsec-glazing",
        label: "Glazing",
        state: "cancelled",
        workedSeconds: 0,
        allowanceSeconds: null,
        typicalSeconds: null,
        shareState: "excluded",
      },
      {
        key: "wsec-repair",
        label: "Repair",
        state: "working",
        workedSeconds: 3000,
        allowanceSeconds: -600,
        pressureSeconds: 0,
        typicalSeconds: 1800,
        shareState: "over_share",
      },
    ],
    11_700,
  ),
};

/** A long pipeline with the active stage at index 7 — visible while collapsed. */
export const productionTimeLongPipelineFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      "Intake",
      "Stripping",
      "Structural Repair",
      "Sanding",
      "Priming",
      "Painting",
      "Finishing",
      "Upholstery",
      "QC",
    ].map((label, index) => ({
      key: `wsec-${index}`,
      label,
      state: index < 7 ? "completed" : index === 7 ? "working" : "pending",
      workedSeconds: index < 7 ? 1200 : index === 7 ? 2400 : 0,
      allowanceSeconds: index === 7 ? 3900 : 1500,
      pressureSeconds: index === 7 ? 3300 : null,
      typicalSeconds: index === 7 ? 3600 : 1500,
    })),
    14_400,
  ),
};

/**
 * Every remaining stage is comfortably on track and the task is still inside
 * its budget, yet it can no longer finish inside it: two completed stages
 * overran by more than a third one came in under, so the 36m + 6m still
 * committed no longer fit in the 27m left. Taken from a real payload
 * (`tsk_01KXGHT2BP0JXVHW065KSJSRVZ`, 2026-08-22) — the case that motivated the
 * outlook line.
 */
export const productionTimeProjectedOverrunFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      {
        key: "wsec-cleaning-seat",
        label: "cleaning seat",
        state: "completed",
        workedSeconds: 6961,
        allowanceSeconds: 2958,
        typicalSeconds: 2877,
        shareState: "over_share",
      },
      {
        key: "wsec-structural-repair",
        label: "structural repair",
        state: "completed",
        workedSeconds: 4977,
        allowanceSeconds: 9550,
        typicalSeconds: 9290,
      },
      {
        key: "wsec-upholstery-removal",
        label: "upholstery removal",
        state: "completed",
        workedSeconds: 2981,
        allowanceSeconds: 1462,
        typicalSeconds: 1422,
        shareState: "over_share",
      },
      {
        key: "wsec-weaving",
        label: "weaving",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 2210,
        typicalSeconds: null,
      },
      {
        key: "wsec-photography",
        label: "photography",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 409,
        typicalSeconds: 398,
      },
    ],
    16_589,
  ),
};

/** Everything is ready — nobody has committed yet. Not an error. */
export const productionTimeNotEvaluatedFixture: ProductionTimeViewModel = {
  kind: "no_budget",
  card: {
    workedLabel: formatWorkSeconds(10_500),
    reasonTitle: "Budget not calculated yet",
    reasonBody:
      "Nothing is missing — the production budget just has not been worked out for this task.",
    rawStatus: "not_evaluated",
    cta: null,
    rows: MOCKUP_ROWS.map((input) => makeRow(input, false)),
  } satisfies ProductionTimeNoBudgetViewModel,
};

/** The item carries no price, so nothing downstream can be calculated. */
export const productionTimeUnvaluedFixture: ProductionTimeViewModel = {
  kind: "no_budget",
  card: {
    workedLabel: formatWorkSeconds(10_500),
    reasonTitle: "This item has no price",
    reasonBody:
      "Add an expected sale price to the item and the production budget follows.",
    rawStatus: "item_unvalued",
    cta: null,
    rows: MOCKUP_ROWS.map((input) => makeRow(input, false)),
  } satisfies ProductionTimeNoBudgetViewModel,
};

/** The task lost its primary item — empty state, never stale numbers. */
export const productionTimeUnavailableFixture: ProductionTimeViewModel = {
  kind: "unavailable",
  reason: "detached",
};

/** A task with no stages assigned yet — the widget renders nothing. */
export const productionTimeEmptyFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard([], 11_700),
};
