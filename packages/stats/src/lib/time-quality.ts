import type { StepContribution, TimeStrategy } from "../types";

// Client-side strategy model for the inaccurate-time estimation views.
// `/daily-steps` always returns all three strategies (`estimated` and each
// step's `estimated_fill_by_strategy`), so switching strategy is pure client
// state — it must never trigger a refetch or enter a query key. The backend's
// `usable` field is intentionally ignored: the usable total is computed here,
// in exactly one place, so `wasted` can never leak into it.
// Contract: HANDOFF_TO_FRONTEND_worker_stats_inaccurate_time_estimation_20260718.

// How the flagged-step estimate is applied to displayed time. The three real
// strategies mirror the backend enum; `"none"` is a frontend-only view mode
// meaning "show trusted time only — add no estimate at all". It is never sent
// to the backend (nothing is), it just suppresses the fill client-side.
export const NO_FILL = "none" as const;
export type TimeFillMode = TimeStrategy | typeof NO_FILL;

// Matches the backend default for `/totals` and `/daily-steps`.
export const DEFAULT_TIME_STRATEGY: TimeStrategy = "median";
export const DEFAULT_FILL_MODE: TimeFillMode = DEFAULT_TIME_STRATEGY;

export const TIME_STRATEGY_LABEL: Record<TimeStrategy, string> = {
  mean: "Mean",
  median: "Median",
  iqr: "IQR",
};

export const FILL_MODE_LABEL: Record<TimeFillMode, string> = {
  ...TIME_STRATEGY_LABEL,
  [NO_FILL]: "Off",
};

// median → mean → iqr → off → median. `none` must stay inside the cycle so the
// control can never strand the user in a mode they cannot leave.
const NEXT_MODE: Record<TimeFillMode, TimeFillMode> = {
  median: "mean",
  mean: "iqr",
  iqr: NO_FILL,
  [NO_FILL]: "median",
};

export function cycleTimeStrategy(current: TimeFillMode): TimeFillMode {
  return NEXT_MODE[current];
}

// True when the mode contributes an estimate at all. Note a real strategy can
// still yield a 0 fill (backend confidence gate: fewer than 4 trusted samples
// suppresses it), so callers wanting "was time actually added" must check the
// resolved seconds, not just the mode.
export function appliesFill(mode: TimeFillMode): mode is TimeStrategy {
  return mode !== NO_FILL;
}

// Fills arrive as floats; displayed seconds are non-negative ints.
export function fillToSeconds(fill: number): number {
  return Math.max(0, Math.round(fill));
}

export type EstimatedByStrategy = Record<TimeStrategy, StepContribution>;

export type UsableTotals = {
  workingSeconds: number;
  pausedSeconds: number;
  completedCount: number;
};

// usable = trusted + estimated fill for the selected mode; under `none` it is
// trusted only. `wasted` is diagnostic-only and deliberately has no path into
// this sum under any mode.
export function usableTotals(
  totals: StepContribution,
  estimated: EstimatedByStrategy | null,
  mode: TimeFillMode,
): UsableTotals {
  const fill = appliesFill(mode) ? (estimated?.[mode] ?? null) : null;
  return {
    workingSeconds:
      totals.working_seconds + fillToSeconds(fill?.working_seconds ?? 0),
    pausedSeconds:
      totals.pause_seconds + fillToSeconds(fill?.pause_seconds ?? 0),
    completedCount: totals.completed_count,
  };
}
