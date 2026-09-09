/**
 * Render fixtures for the production-time widget.
 *
 * These exist so the visual layer is reviewable and testable before the
 * endpoint ships. The little `makeRow` / `makeBudgetCard` helpers below mirror
 * what the real DTO transform will do, but they take plain numbers rather than
 * the response shape — the actual `toProductionTimeViewModel` belongs to the
 * logic track and parses the payload proper.
 */

import { buildTypicalStrategy } from "../../lib/typical-strategy";
import {
  buildActiveMetrics,
  buildHeadlineCost,
  buildInfeasibleNotice,
  buildOutlook,
  buildOutlookLabel,
  buildRowDetail,
  buildRowUnitReading,
  buildSegments,
  buildTerminalMetrics,
  formatUnitWorkSeconds,
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
  /** Whole-order, as the projection is served. */
  typicalSeconds?: number | null;
  /** Per piece. Defaults to the whole-order figure, i.e. a quantity-1 order. */
  unitTypicalSeconds?: number | null;
  shareState?: ProductionTimeShareState;
};


/**
 * The fixtures' strategy: a named category on the plain narrowed rung, which
 * is the ordinary case the rest of these fixtures model. Built through the real
 * builder so a change to the copy shows up in the fixtures too.
 */
const FIXTURE_STRATEGY = buildTypicalStrategy({
  resolution: {
    task_typical_basis: "item_narrowed_uniform",
    reconciliation_method: "uniform_basis_v1",
    comparability_profile: "primary_item_category_v1",
    applied_filter: {
      item_category_ids: ["itc_chair"],
      item_categories: [{ client_id: "itc_chair", name: "Chair" }],
    },
    facet: null,
    participating_section_count: 3,
    sections_by_basis: {
      item_properties_narrowed: 0,
      item_facet_narrowed: 0,
      item_narrowed: 3,
      section_wide: 0,
      insufficient_sample: 0,
    },
  },
  windowDays: 90,
  minSampleSize: 5,
});

/** The wording both readings of a fixture row's allowance line share. */
const FIXTURE_ALLOWANCE_SUFFIX = "allowed";

function makeRow(
  input: RowInput,
  hasBudget: boolean,
  /** Above 1, the row gains a per-piece reading, exactly as the transform does. */
  quantity = 1,
): ProductionTimeRowViewModel {
  const shareState = input.shareState ?? "on_track";
  const isActive = ["working", "paused", "ended_shift"].includes(input.state);
  const isPending = input.state === "pending";
  const isTerminal = ["completed", "skipped", "failed", "cancelled"].includes(
    input.state,
  );
  const isExcluded = shareState === "excluded";
  const typicalSeconds = input.typicalSeconds ?? null;
  const unitTypicalSeconds = input.unitTypicalSeconds ?? typicalSeconds;
  const leftSeconds =
    input.allowanceSeconds === null || input.allowanceSeconds === undefined
      ? null
      : input.allowanceSeconds - input.workedSeconds;
  const hasTerminalMetrics = isTerminal && hasBudget;
  const hasActiveMetrics = (isActive || isPending) && hasBudget && !isExcluded;
  const hasDetail = isActive && hasBudget && !isExcluded;

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
        : `${formatWorkSeconds(input.allowanceSeconds)} ${FIXTURE_ALLOWANCE_SUFFIX}`,
    pressureLabel: null,
    typicalLabel:
      typicalSeconds === null
        ? null
        : `typical ${formatUnitWorkSeconds(typicalSeconds)}`,
    typicalComparisonLabel:
      typicalSeconds === null
        ? null
        : `of typically ${formatUnitWorkSeconds(typicalSeconds)}`,
    unitTypicalSeconds,
    projectedTypicalSeconds: typicalSeconds,
    terminalMetrics: hasTerminalMetrics
      ? buildTerminalMetrics(
          input.workedSeconds,
          input.allowanceSeconds ?? null,
          typicalSeconds,
        )
      : null,
    activeMetrics: hasActiveMetrics
      ? buildActiveMetrics(
          input.allowanceSeconds ?? null,
          input.pressureSeconds ?? null,
          typicalSeconds,
          leftSeconds,
          shareState,
        )
      : null,
    detail: hasDetail
      ? buildRowDetail(
          input.workedSeconds,
          input.allowanceSeconds ?? null,
          input.pressureSeconds ?? null,
          leftSeconds,
          shareState,
        )
      : null,
    unit:
      quantity <= 1
        ? null
        : buildRowUnitReading({
            quantity,
            workedSeconds: input.workedSeconds,
            allowanceSeconds: input.allowanceSeconds ?? null,
            pressureSeconds: input.pressureSeconds ?? null,
            leftSeconds,
            unitTypicalSeconds,
            shareState,
            hasTerminalMetrics,
            hasActiveMetrics,
            hasDetail,
            allowanceSuffix: FIXTURE_ALLOWANCE_SUFFIX,
          }),
  };
}

function makeBudgetCard(
  inputs: RowInput[],
  budgetSeconds: number,
  options: {
    isFinal?: boolean;
    /** The served `production_budget_minor` of an `infeasible` task — negative. */
    infeasibleBudgetMinor?: number | null;
    /**
     * Drops the "of …" term from both units, as an infeasible task does: there
     * is no pot to quote and the banner above already states the shortfall.
     */
    withoutBudgetTerm?: boolean;
    /**
     * The served money trio, in the payload's own order. Omit it to model a
     * worker or seller session, whose body carries no money at all and whose
     * headline therefore does not offer the cost tap.
     */
    costMinor?: {
      productionBudget: number;
      consumed: number;
      variance: number;
    };
    /**
     * The order's piece count. Left at 1 the card carries no per-piece reading
     * and renders no unit toggle, which is every fixture that predates it.
     */
    quantity?: number;
  } = {},
): ProductionTimeCardViewModel {
  const quantity = options.quantity ?? 1;
  const divisor = quantity > 1 ? quantity : null;
  const rows = inputs.map((input) => makeRow(input, true, quantity));
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
    strategy: FIXTURE_STRATEGY,
    headline: {
      workedLabel: formatWorkSeconds(totalWorked),
      budgetLabel: options.withoutBudgetTerm
        ? null
        : `of ${formatWorkSeconds(budgetSeconds)}`,
      remainingLabel:
        remainingSeconds >= 0
          ? `${formatWorkSeconds(remainingSeconds)} left`
          : `${formatWorkSeconds(-remainingSeconds)} over`,
      isOverBudget: remainingSeconds < 0,
      isFinal,
      cost:
        isFinal || options.costMinor === undefined
          ? null
          : buildHeadlineCost(
              options.withoutBudgetTerm
                ? null
                : options.costMinor.productionBudget,
              options.costMinor.consumed,
              options.costMinor.variance,
            ),
    },
    infeasibleNotice:
      options.infeasibleBudgetMinor === undefined
        ? null
        : // The pot in both units: `budgetSeconds` is the served negative
          // allowance, the same money divided by the evaluation's rate.
          buildInfeasibleNotice(options.infeasibleBudgetMinor, budgetSeconds),
    segments,
    remainderPercent,
    outlook,
    rows,
    unit:
      divisor === null
        ? null
        : {
            headline: {
              workedLabel: formatUnitWorkSeconds(totalWorked / divisor),
              budgetLabel: options.withoutBudgetTerm
                ? null
                : `of ${formatUnitWorkSeconds(budgetSeconds / divisor)}`,
              remainingLabel:
                remainingSeconds >= 0
                  ? `${formatUnitWorkSeconds(remainingSeconds / divisor)} left`
                  : `${formatUnitWorkSeconds(-remainingSeconds / divisor)} over`,
            },
            outlook:
              outlook === null
                ? null
                : {
                    label: buildOutlookLabel(
                      outlook.remainingCommitmentSeconds / divisor,
                      outlook.projectedOverrunSeconds / divisor,
                      formatUnitWorkSeconds,
                    ),
                    remainingCommitmentSeconds:
                      outlook.remainingCommitmentSeconds / divisor,
                    projectedOverrunSeconds:
                      outlook.projectedOverrunSeconds / divisor,
                  },
            infeasibleNotice:
              options.infeasibleBudgetMinor === undefined
                ? null
                : buildInfeasibleNotice(
                    // Money untouched; only the "of work" figure divides.
                    options.infeasibleBudgetMinor,
                    budgetSeconds / divisor,
                    formatUnitWorkSeconds,
                  ),
          },
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

/**
 * The approved mockup: 2h 55m of 3h 15m, 20m left, Upholstery in progress.
 * Served with money, so its headline also carries the cost reading behind the
 * tap — 2 278,50 kr of 2 539 kr at roughly 13,02 kr a worker-minute.
 */
export const productionTimeMockupFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(MOCKUP_ROWS, 11_700, {
    costMinor: {
      productionBudget: 253_900,
      consumed: 227_850,
      variance: 26_050,
    },
  }),
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
        pressureSeconds: 600,
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
    // 4h worked against a 3h 15m pot: 3 124,80 kr spent, 585,80 kr over.
    {
      costMinor: {
        productionBudget: 253_900,
        consumed: 312_480,
        variance: -58_580,
      },
    },
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

/**
 * An `infeasible` task: the item's non-labour costs came to 500,00 kr more
 * than its sale price, so the pot was negative before any division and every
 * section's slice is a legitimate 0m. Taken from a real payload
 * (`tsk_01M0J44TAJ66HDF600CNV7YB8E`, 2026-08-26) together with the money block
 * of the handoff's worked example.
 *
 * The one case where the notice carries the whole meaning of the card — the
 * figures under it are all zeros and say nothing on their own. The headline
 * quotes no budget in either unit, since there is none to quote.
 */
export const productionTimeInfeasibleFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(
    [
      {
        key: "wsec-cleaning-wood",
        label: "cleaning wood",
        state: "completed",
        workedSeconds: 3781,
        allowanceSeconds: 0,
        typicalSeconds: 2462,
        shareState: "over_share",
      },
      {
        key: "wsec-wood-fix",
        label: "wood fix",
        state: "completed",
        workedSeconds: 0,
        allowanceSeconds: 0,
        typicalSeconds: 1980,
      },
      {
        key: "wsec-ground-oil",
        label: "ground oil",
        state: "completed",
        workedSeconds: 147,
        allowanceSeconds: 0,
        typicalSeconds: 338,
        shareState: "over_share",
      },
      {
        key: "wsec-hardwax-oil",
        label: "hardwax oil",
        state: "completed",
        workedSeconds: 148,
        allowanceSeconds: 0,
        typicalSeconds: 246,
        shareState: "over_share",
      },
      {
        key: "wsec-photography",
        label: "photography",
        state: "pending",
        workedSeconds: 0,
        allowanceSeconds: 0,
        pressureSeconds: 0,
        typicalSeconds: 460,
      },
    ],
    // −38.40 worker-minutes. Negative, deliberately unclamped: it is what makes
    // the headline read "of 0m" with "1h 46m over" beside it.
    -2304,
    {
      infeasibleBudgetMinor: -50_000,
      withoutBudgetTerm: true,
      // The handoff's worked example: a −500,00 kr pot, 884,56 kr of time
      // already spent against it, 1 384,56 kr over.
      costMinor: {
        productionBudget: -50_000,
        consumed: 88_456,
        variance: -138_456,
      },
    },
  ),
};

/** Everything is ready — nobody has committed yet. Not an error. */
export const productionTimeNotEvaluatedFixture: ProductionTimeViewModel = {
  kind: "no_budget",
  card: {
    strategy: FIXTURE_STRATEGY,
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
    strategy: FIXTURE_STRATEGY,
    workedLabel: formatWorkSeconds(10_500),
    reasonTitle: "This item has no price",
    reasonBody:
      "Add an expected sale price to the item and the production budget follows.",
    rawStatus: "item_unvalued",
    cta: null,
    rows: MOCKUP_ROWS.map((input) => makeRow(input, false)),
  } satisfies ProductionTimeNoBudgetViewModel,
};

/**
 * A four-piece order, for the unit toggle.
 *
 * Every `unitTypicalSeconds` here is deliberately NOT `typicalSeconds / 4`, so
 * the fixture is itself the guard: the moment anyone makes the code derive one
 * typical from the other, these rows render a different number and the tests
 * fail loudly. (Structural: 4200 whole-order would divide to 1050 — "18m" — but
 * the served per-piece median is 1320, which reads "22m".)
 */
const MULTI_UNIT_ROWS: RowInput[] = [
  {
    key: "wsec-structural",
    label: "Structural Repair",
    state: "completed",
    workedSeconds: 4200,
    allowanceSeconds: 4500,
    typicalSeconds: 4200,
    unitTypicalSeconds: 1320,
  },
  {
    key: "wsec-sanding",
    label: "Sanding",
    state: "completed",
    workedSeconds: 3000,
    allowanceSeconds: 3000,
    typicalSeconds: 3000,
    unitTypicalSeconds: 900,
  },
  {
    key: "wsec-finishing",
    label: "Finishing",
    state: "paused",
    workedSeconds: 900,
    allowanceSeconds: 1800,
    pressureSeconds: 1800,
    typicalSeconds: 1800,
    unitTypicalSeconds: 600,
  },
  {
    key: "wsec-upholstery",
    label: "Upholstery",
    state: "working",
    workedSeconds: 2400,
    allowanceSeconds: 3900,
    pressureSeconds: 3300,
    typicalSeconds: 3600,
    unitTypicalSeconds: 1200,
  },
];

/**
 * The mockup's figures on an order of four: 2h 55m of 3h 15m whole-order,
 * 44m of 49m per piece. Carries money, so the headline still offers the cost
 * tap — which stays in kronor for the whole order in both units — and its two
 * open stages still commit more time than the pot has left, so the outlook
 * sentence is exercised in both units too.
 */
export const productionTimeMultiUnitFixture: ProductionTimeViewModel = {
  kind: "budget",
  card: makeBudgetCard(MULTI_UNIT_ROWS, 11_700, {
    quantity: 4,
    costMinor: {
      productionBudget: 253_900,
      consumed: 227_850,
      variance: 26_050,
    },
  }),
};

/** The same four-piece order before anyone committed a budget. */
export const productionTimeMultiUnitNoBudgetFixture: ProductionTimeViewModel = {
  kind: "no_budget",
  card: {
    strategy: FIXTURE_STRATEGY,
    workedLabel: formatWorkSeconds(10_500),
    reasonTitle: "Budget not calculated yet",
    reasonBody:
      "Nothing is missing — the production budget just has not been worked out for this task.",
    rawStatus: "not_evaluated",
    cta: null,
    rows: MULTI_UNIT_ROWS.map((input) => makeRow(input, false, 4)),
    unit: { workedLabel: formatUnitWorkSeconds(10_500 / 4) },
  } satisfies ProductionTimeNoBudgetViewModel,
};

/**
 * An infeasible four-piece order. The notice's krona shortfall is identical in
 * both units — money is never divided — while the "about … of work" figure
 * beside it goes from 38m to 10m.
 */
export const productionTimeMultiUnitInfeasibleFixture: ProductionTimeViewModel =
  {
    kind: "budget",
    card: makeBudgetCard(
      MULTI_UNIT_ROWS.map((input) => ({
        ...input,
        allowanceSeconds: 0,
        shareState: "over_share" as const,
      })),
      -2304,
      {
        quantity: 4,
        infeasibleBudgetMinor: -50_000,
        withoutBudgetTerm: true,
        costMinor: {
          productionBudget: -50_000,
          consumed: 88_456,
          variance: -138_456,
        },
      },
    ),
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
