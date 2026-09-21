import { formatWorkSeconds } from "./production-time-view-model";
import type { TaskBudgetSignal, TaskBudgetSignalCurrency } from "../types";

export type TaskBudgetSignalDisplayViewModel = {
  tone: "over" | "projected_over";
  label: string;
  costLabel: string | null;
};

const currencySuffix: Record<TaskBudgetSignalCurrency, string | null> = {
  swedish_krona: "kr",
  danish_krona: "DKK",
  euro: "€",
  no_currency: null,
};

const moneyFormatter = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Non-breaking space before the suffix, matching the group separator sv-SE
 * already emits: an amount is one token and must never wrap, least of all
 * leaving a bare "kr" alone on the next line.
 */
function formatCost(
  minor: number,
  currency: TaskBudgetSignalCurrency,
): string | null {
  const suffix = currencySuffix[currency];
  return suffix === null
    ? null
    : `${moneyFormatter.format(minor / 100)}\u00a0${suffix}`;
}

/**
 * Seconds this task accrues per wall-clock second, summed over whatever is
 * running on it right now — two workers on one task exceed 1.
 *
 * `null` is the case this exists for: nothing is running, so the figure must
 * hold still. Before the server published this, an idle task's overrun crept
 * upward between polls and snapped back on each one.
 */
function taskAccrualRate(signal: TaskBudgetSignal): number {
  if (signal.live_accrual_rate === null) {
    return 0;
  }

  const parsed = Number(signal.live_accrual_rate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Renders the server-owned verdict without recreating its projection rule. A
 * fresh payload re-anchors the baseline; until the next poll only displayed
 * time advances, and only as fast as the task is actually being worked. Costs
 * remain the served, precisely rounded money values.
 */
export function buildTaskBudgetSignalDisplay(
  signal: TaskBudgetSignal,
  elapsedMs = 0,
): TaskBudgetSignalDisplayViewModel | null {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((elapsedMs / 1000) * taskAccrualRate(signal)),
  );

  switch (signal.budget_state) {
    case "over": {
      const overrunSeconds = Math.max(
        signal.over_seconds,
        signal.actual_worked_seconds + elapsedSeconds - signal.allowed_seconds,
      );
      return {
        tone: "over",
        label: `Over budget by ${formatWorkSeconds(overrunSeconds)}`,
        costLabel: formatCost(signal.over_cost_minor, signal.currency),
      };
    }
    case "projected_over":
      return {
        tone: "projected_over",
        label: `Projected over by ${formatWorkSeconds(
          signal.projected_over_seconds + elapsedSeconds,
        )}`,
        costLabel: formatCost(
          signal.projected_over_cost_minor,
          signal.currency,
        ),
      };
    case "within_budget":
    case "no_budget":
      return null;
  }
}
