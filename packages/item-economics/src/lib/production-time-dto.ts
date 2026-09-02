import type { ItemEconomicsStatus, TaskProductionTime } from "../types";
import {
  buildOutlook,
  buildActiveMetrics,
  buildHeadlineCost,
  buildInfeasibleNotice,
  buildRowDetail,
  buildSegments,
  buildTerminalMetrics,
  PRODUCTION_TIME_UNIT_SUFFIX,
  formatUnitWorkSeconds,
  formatWorkSeconds,
  humanizeSectionState,
  stateToTone,
  type ProductionTimeRowViewModel,
  type ProductionTimeViewModel,
} from "./production-time-view-model";
import { buildTypicalStrategy } from "./typical-strategy";

type NoBudgetStatus = Exclude<ItemEconomicsStatus, "ok" | "infeasible">;

const ACTIVE_SECTION_STATES = new Set(["working", "paused", "ended_shift"]);
const TERMINAL_SECTION_STATES = new Set([
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);

const NO_BUDGET_REASON: Record<
  NoBudgetStatus,
  { title: string; body: string }
> = {
  not_evaluated: {
    title: "Budget not calculated yet",
    body: "Nothing is missing — the production budget just has not been worked out for this task.",
  },
  item_unvalued: {
    title: "This item has no price",
    body: "Add an expected sale price to the item and the production budget follows.",
  },
  item_missing_expected_price: {
    title: "The price has no expected sale amount",
    body: "The item's valuation is missing the expected sale price.",
  },
  item_missing_purchase_cost: {
    title: "The item has no purchase cost",
    body: "The cost model needs a purchase cost for this item.",
  },
  item_missing_major_category: {
    title: "This item has no category",
    body: "Set the item's category to wood or seat.",
  },
  not_configured_no_cost_group: {
    title: "The workshop is not set up for this category",
    body: "No production cost group exists for this item's category.",
  },
  not_configured_ambiguous_cost_group: {
    title: "More than one cost group matches",
    body: "Two active cost groups claim this category — economics settings need one.",
  },
  not_configured_no_basis_version: {
    title: "The cost group has no cost basis",
    body: "Add a monthly cost and paid capacity in economics settings.",
  },
  not_configured_no_cost_model_version: {
    title: "No cost model is set",
    body: "Economics settings need an open cost model version.",
  },
  currency_mismatch: {
    title: "Prices are in different currencies",
    body: "The item's price and the workshop configuration do not share a currency.",
  },
};

function decimalMinutesToSeconds(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const minutes = Number(value);
  return Number.isFinite(minutes) ? Math.round(minutes * 60) : null;
}

/**
 * `typical_unit_worker_seconds` is already in seconds and is the only served
 * duration that may be fractional, so it is kept fractional here and rounded
 * once, at the formatter.
 */
function decimalSeconds(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : null;
}

function toRows(
  dto: TaskProductionTime,
  hasBudget: boolean,
): ProductionTimeRowViewModel[] {
  // This deliberately maps 1:1. The backend owns pipeline order and has
  // already collapsed reassignments into one section row.
  return dto.sections.map((section, index) => {
    const workedSeconds = section.worked_seconds;
    const label =
      section.section_name_snapshot ??
      section.section_name ??
      "Unnamed section";
    const isActive = ACTIVE_SECTION_STATES.has(section.state);
    const isPending = section.state === "pending";
    const isTerminal = TERMINAL_SECTION_STATES.has(section.state);
    const isExcluded = section.share_state === "excluded";
    // The quantity-aware projection, not the raw historical median: it answers
    // "how long should *this* order take", and is the only typical that may be
    // read directly against a worked total. The raw median is the fallback for
    // a backend mid-deploy, never a client-side multiplication
    // (handoff quantity_normalized_typicals 2026-08-29).
    const projectedTypicalSeconds =
      section.typical?.projected_typical_worker_seconds ??
      section.typical?.typical_worker_seconds ??
      null;
    // The per-piece median is what the row *displays*. It is the figure a
    // worker can hold in their head — it does not move when the order quantity
    // does — and it is comparable across orders, which the projection is not.
    //
    // At quantity 1 the projection *is* the per-piece figure, so that identity
    // covers a mid-deploy backend that serves no unit field. Above quantity 1
    // there is no fallback: dividing the projection here would be exactly the
    // client-side derivation the handoff rules out, and the server rounds
    // half-even at the projection step, so the result would not even agree with
    // the number it was derived from.
    const unitTypicalSeconds =
      decimalSeconds(section.typical?.typical_unit_worker_seconds) ??
      (dto.projection_quantity === 1 ? projectedTypicalSeconds : null);

    return {
      key: section.working_section_id || `${label}-${index}`,
      label,
      tone: isExcluded ? "excluded" : stateToTone(section.state),
      stateLabel: humanizeSectionState(section.state),
      workedLabel: formatWorkSeconds(workedSeconds),
      workedSeconds,
      stepCount: section.step_count,
      isActive,
      isTerminal,
      isExcluded,
      allowanceLabel:
        section.allowance_seconds === null || section.allowance_seconds <= 0
          ? null
          : `${formatWorkSeconds(section.allowance_seconds)} assigned`,
      // Compact blocked rows retain the served pressure. Active and pending
      // rows use activeMetrics, where it is capped by the assignment.
      pressureLabel:
        section.pressure_share_seconds === null
          ? null
          : `${formatWorkSeconds(section.pressure_share_seconds)} pressure`,
      typicalLabel:
        unitTypicalSeconds === null
          ? null
          : `typical ${PRODUCTION_TIME_UNIT_SUFFIX} ${formatUnitWorkSeconds(
              unitTypicalSeconds,
            )}`,
      // Whole-order deliberately: this line is glued to `workedLabel` — "25m of
      // typically 50m" — and a per-piece figure there would invite the reader
      // to subtract two numbers that are not in the same unit.
      typicalComparisonLabel:
        projectedTypicalSeconds === null
          ? null
          : `of typically ${formatWorkSeconds(projectedTypicalSeconds)}`,
      unitTypicalSeconds,
      projectedTypicalSeconds,
      terminalMetrics:
        isTerminal && hasBudget
          ? buildTerminalMetrics(
              workedSeconds,
              section.allowance_seconds,
              unitTypicalSeconds,
            )
          : null,
      activeMetrics:
        (isActive || isPending) && hasBudget && !isExcluded
          ? buildActiveMetrics(
              section.allowance_seconds,
              section.pressure_share_seconds,
              unitTypicalSeconds,
              section.left_seconds,
              section.share_state,
            )
          : null,
      detail:
        isActive && hasBudget && !isExcluded
          ? buildRowDetail(
              workedSeconds,
              section.allowance_seconds,
              section.pressure_share_seconds,
              section.left_seconds,
              section.share_state,
            )
          : null,
    };
  });
}

function remainingLabel(remainingSeconds: number | null): string | null {
  if (remainingSeconds === null) {
    return null;
  }

  return remainingSeconds >= 0
    ? `${formatWorkSeconds(remainingSeconds)} left`
    : `${formatWorkSeconds(-remainingSeconds)} over`;
}

/**
 * Source seconds are the server's live figures. The view model only derives
 * display relationships from the same snapshot: terminal variance and an
 * active section's position against its capped pressure target. Since the
 * payload already contains the open working interval (concurrency-averaged),
 * nothing here may add client-elapsed time — a local tick would double-count.
 * Two standing rules from that handoff:
 * this is a live operational projection, never payroll or archival data
 * (§4.3); and a served decrease is authoritative — render it as given,
 * never clamp to a previously displayed maximum (§5).
 */
export function toProductionTimeViewModel(
  dto: TaskProductionTime,
): ProductionTimeViewModel {
  if (dto.item_binding !== "bound") {
    return { kind: "unavailable", reason: dto.item_binding };
  }

  const hasBudget = dto.status === "ok" || dto.status === "infeasible";
  const rows = toRows(dto, hasBudget);
  // The window and gate live on the per-section typical, not the task root, so
  // they are read from the first section that has one. A task with no typical
  // anywhere reports the basis without them rather than asserting a
  // configuration this response never stated.
  const sampledTypical =
    dto.sections.find((section) => section.typical !== null)?.typical ?? null;
  const strategy = buildTypicalStrategy({
    resolution: dto.typical_resolution,
    windowDays: sampledTypical?.window_days ?? null,
    minSampleSize: sampledTypical?.min_sample_size ?? null,
  });

  if (dto.status !== "ok" && dto.status !== "infeasible") {
    const workedSeconds = rows.reduce(
      (sum, row) => sum + row.workedSeconds,
      0,
    );
    const reason = NO_BUDGET_REASON[dto.status];

    return {
      kind: "no_budget",
      card: {
        strategy,
        workedLabel: formatWorkSeconds(workedSeconds),
        reasonTitle: reason.title,
        reasonBody: reason.body,
        rawStatus: dto.status,
        cta: null,
        rows,
      },
    };
  }

  const storedRowsWorkedSeconds = dto.sections.reduce(
    (sum, section) => sum + section.worked_seconds,
    0,
  );
  const budgetSeconds =
    decimalMinutesToSeconds(dto.budget.allowed_worker_minutes) ?? 0;
  const final = dto.final;
  const isFinal = final !== null;
  const workedSeconds = final
    ? (decimalMinutesToSeconds(final.actual_worker_minutes) ?? 0)
    : (dto.budget.actual_worker_seconds ?? storedRowsWorkedSeconds);
  const remainingSeconds = final
    ? decimalMinutesToSeconds(final.variance_worker_minutes)
    : (decimalMinutesToSeconds(dto.budget.remaining_worker_minutes) ??
      budgetSeconds - workedSeconds);
  const { segments, remainderPercent } = buildSegments(rows, budgetSeconds);
  // A closed task has no work left to project — its numbers are frozen.
  const outlook = isFinal
    ? null
    : buildOutlook(
        dto.sections.map((section) => ({
          state: section.state,
          leftSeconds: section.left_seconds,
        })),
        remainingSeconds,
      );

  // An infeasible task has no pot for the headline to quote. Both readings of
  // it mislead: the time floors at "of 0m", which looks like missing data, and
  // the money shows "of −500 kr", which turns the row into an apparent
  // subtraction — worked minus budget — that is not what the figures mean. The
  // banner above already states the shortfall in full, so the budget term is
  // dropped from both units and the headline says what was spent and how far
  // past the line that puts the item.
  const isInfeasible = dto.status === "infeasible";

  return {
    kind: "budget",
    card: {
      strategy,
      headline: {
        workedLabel: formatWorkSeconds(workedSeconds),
        budgetLabel:
          isInfeasible || dto.budget.allowed_worker_minutes === null
            ? null
            : `of ${formatWorkSeconds(budgetSeconds)}`,
        remainingLabel: remainingLabel(remainingSeconds),
        isOverBudget: remainingSeconds !== null && remainingSeconds < 0,
        isFinal,
        // A closed task takes its time from the frozen `final` block, which the
        // endpoint deliberately serves money-free. Pairing those minutes with
        // the live cost below would put two different snapshots either side of
        // one tap, so the closed card simply does not offer it.
        cost: isFinal
          ? null
          : buildHeadlineCost(
              // Withheld rather than negated: the builder's existing "no pot
              // served" path is exactly the rendering an infeasible task wants.
              isInfeasible ? null : dto.budget.production_budget_minor,
              dto.budget.consumed_cost_minor,
              dto.budget.variance_cost_minor,
            ),
      },
      // The status is the trigger, never the sign of the money: `infeasible`
      // means `allowed_worker_minutes <= 0` and keeps meaning that whether or
      // not this role was served the cost that explains it.
      infeasibleNotice: isInfeasible
        ? buildInfeasibleNotice(
            dto.budget.production_budget_minor,
            // The served negative allowance, not `budgetSeconds`, which floors
            // its null to 0 and would silently lose the shortfall.
            decimalMinutesToSeconds(dto.budget.allowed_worker_minutes),
          )
        : null,
      segments,
      remainderPercent,
      outlook,
      rows,
    },
  };
}
