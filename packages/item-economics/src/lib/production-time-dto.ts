import type { ItemEconomicsStatus, TaskProductionTime } from "../types";
import {
  buildFooterNote,
  buildRowDetail,
  buildSegments,
  formatWorkSeconds,
  humanizeSectionState,
  stateToTone,
  type ProductionTimeRowViewModel,
  type ProductionTimeViewModel,
} from "./production-time-view-model";

type NoBudgetStatus = Exclude<ItemEconomicsStatus, "ok" | "infeasible">;

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

function liveTickSeconds(
  state: string,
  stateEnteredAt: string | null,
  nowMs: number,
): number {
  if (state !== "working" || stateEnteredAt === null) {
    return 0;
  }

  const enteredAtMs = Date.parse(stateEnteredAt);
  if (!Number.isFinite(enteredAtMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - enteredAtMs) / 1_000));
}

function toRows(
  dto: TaskProductionTime,
  nowMs: number,
  hasBudget: boolean,
): { rows: ProductionTimeRowViewModel[]; totalLiveTickSeconds: number } {
  let totalLiveTickSeconds = 0;

  // This deliberately maps 1:1. The backend owns pipeline order and has
  // already collapsed reassignments into one section row.
  const rows = dto.sections.map((section, index) => {
    // Display-only extrapolation: concurrent sections can temporarily
    // over-count the backend's averaged credit until the next reconciliation.
    const tickSeconds = liveTickSeconds(
      section.state,
      section.state_entered_at,
      nowMs,
    );
    totalLiveTickSeconds += tickSeconds;

    const workedSeconds = section.worked_seconds + tickSeconds;
    const label =
      section.section_name_snapshot ??
      section.section_name ??
      "Unnamed section";
    const isActive = section.state === "working";
    const isExcluded = section.share_state === "excluded";
    const typicalSeconds = section.typical?.typical_worker_seconds ?? null;

    return {
      key: section.working_section_id || `${label}-${index}`,
      label,
      tone: isExcluded ? "excluded" : stateToTone(section.state),
      stateLabel: humanizeSectionState(section.state),
      workedLabel: formatWorkSeconds(workedSeconds),
      workedSeconds,
      stepCount: section.step_count,
      isActive,
      isExcluded,
      typicalLabel:
        typicalSeconds === null
          ? null
          : `typical ${formatWorkSeconds(typicalSeconds)}`,
      typicalComparisonLabel:
        typicalSeconds === null
          ? null
          : `of typically ${formatWorkSeconds(typicalSeconds)}`,
      detail:
        isActive && hasBudget && !isExcluded
          ? buildRowDetail(
              workedSeconds,
              section.allowance_seconds,
              typicalSeconds,
              section.share_state,
            )
          : null,
    };
  });

  return { rows, totalLiveTickSeconds };
}

/**
 * Stages the remaining time is still "left for" — i.e. work someone can
 * actually start. Deliberately excludes every state the backend treats as
 * terminal (`TERMINAL_STEP_STATES` = completed, skipped, failed, cancelled):
 * a terminal section has no open step, so naming it sends the reader looking
 * for work nobody is meant to do.
 *
 * `failed` was here until review round 2 (finding G1). It is reachable — a
 * section completed once and re-run unsuccessfully arrives as `state:
 * "failed"` with `share_state` not `excluded`, because the earlier completed
 * pass keeps the group allocated — and naming it contradicted both the
 * backend's own terminal set and this function's treatment of `cancelled`
 * and `skipped`, which sit in the same frozenset.
 */
function isUnfinishedSectionState(state: string): boolean {
  return (
    state === "pending" ||
    state === "paused" ||
    state === "ended_shift" ||
    state === "blocked"
  );
}

function pendingLabels(
  sections: TaskProductionTime["sections"],
  rows: readonly ProductionTimeRowViewModel[],
): string[] {
  return sections.flatMap((section, index) => {
    const row = rows[index];

    return row &&
      !row.isActive &&
      !row.isExcluded &&
      isUnfinishedSectionState(section.state)
      ? [row.label]
      : [];
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

export function toProductionTimeViewModel(
  dto: TaskProductionTime,
  nowMs: number,
): ProductionTimeViewModel {
  if (dto.item_binding !== "bound") {
    return { kind: "unavailable", reason: dto.item_binding };
  }

  const hasBudget = dto.status === "ok" || dto.status === "infeasible";
  const { rows, totalLiveTickSeconds } = toRows(dto, nowMs, hasBudget);

  if (dto.status !== "ok" && dto.status !== "infeasible") {
    const workedSeconds = rows.reduce(
      (sum, row) => sum + row.workedSeconds,
      0,
    );
    const reason = NO_BUDGET_REASON[dto.status];

    return {
      kind: "no_budget",
      card: {
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
  const storedHeadlineWorkedSeconds = final
    ? (decimalMinutesToSeconds(final.actual_worker_minutes) ?? 0)
    : (dto.budget.actual_worker_seconds ?? storedRowsWorkedSeconds);
  const headlineTickSeconds = isFinal ? 0 : totalLiveTickSeconds;
  const workedSeconds = storedHeadlineWorkedSeconds + headlineTickSeconds;
  const storedRemainingSeconds = final
    ? decimalMinutesToSeconds(final.variance_worker_minutes)
    : (decimalMinutesToSeconds(dto.budget.remaining_worker_minutes) ??
      budgetSeconds - storedHeadlineWorkedSeconds);
  const remainingSeconds =
    storedRemainingSeconds === null
      ? null
      : storedRemainingSeconds - headlineTickSeconds;
  const { segments, remainderPercent } = buildSegments(rows, budgetSeconds);

  return {
    kind: "budget",
    card: {
      headline: {
        workedLabel: formatWorkSeconds(workedSeconds),
        budgetLabel:
          dto.budget.allowed_worker_minutes === null
            ? null
            : `of ${formatWorkSeconds(budgetSeconds)}`,
        remainingLabel: remainingLabel(remainingSeconds),
        isOverBudget: remainingSeconds !== null && remainingSeconds < 0,
        isFinal,
      },
      segments,
      remainderPercent,
      rows,
      footerNote: buildFooterNote(
        remainingSeconds,
        pendingLabels(dto.sections, rows),
      ),
    },
  };
}
