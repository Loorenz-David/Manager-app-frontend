// Pure decision logic for the horizontal date pager (Google-Calendar-style):
// the day columns track the finger during a horizontal drag, then settle to a
// page on release. Keeping thresholds and the settle decision here (out of the
// DOM hook) makes the behavior unit-testable and tunable in one place.

// Movement below this is a tap; beyond it the gesture locks to one axis.
export const AXIS_LOCK_THRESHOLD_PX = 8;
// Drag distance (as a fraction of the viewport width) that commits — kept low
// so a page turn needs little sliding (short slower drags still snap back).
export const PAGE_COMMIT_DISTANCE_RATIO = 0.2;
// A fast flick commits even on a short drag…
export const FLING_VELOCITY_PX_PER_MS = 0.4;
// …but never on a negligible one (guards against jittery release samples).
export const FLING_MIN_DISTANCE_PX = 24;
// Dragging into the future clamp moves at reduced ratio (rubber-band feel).
export const EDGE_RESISTANCE_DIVISOR = 3;
// Settle animation length after release.
export const SETTLE_DURATION_MS = 240;
// Velocity is measured over the trailing window of move samples.
export const VELOCITY_WINDOW_MS = 100;

export type PanAxis = "x" | "y";

// One rendered pager page: its focus anchor + the dates its columns show.
export type TimelinePagerPage = {
  key: string;
  dates: string[];
};

export type TimelinePagerPages = {
  prev: TimelinePagerPage;
  current: TimelinePagerPage;
  // Absent at the future clamp (Phase 1: no dates beyond today).
  next: TimelinePagerPage | null;
};

// Direction lock: undecided under the threshold; otherwise the dominant axis.
export function resolvePanAxis(dx: number, dy: number): PanAxis | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < AXIS_LOCK_THRESHOLD_PX && absY < AXIS_LOCK_THRESHOLD_PX) {
    return null;
  }

  return absX > absY ? "x" : "y";
}

// Dragging left (toward newer dates) past the today clamp rubber-bands.
export function applyEdgeResistance(dx: number, canGoNext: boolean): number {
  if (dx < 0 && !canGoNext) {
    return dx / EDGE_RESISTANCE_DIVISOR;
  }

  return dx;
}

export type PanSettleResolution =
  | { kind: "stay" }
  | { kind: "commit"; direction: "prev" | "next"; days: number };

// Release decision: commit on distance or on a same-direction fling; snap
// back otherwise. `dx` is the (already resistance-adjusted) drag offset —
// negative reveals newer dates.
//
// Step granularity: a CONTROLLED slide (distance commit) steps one day; only
// a MOMENTUM fling turns the full span page (3 days in three-day mode). In
// single-day mode both are the same one-day step. Next-steps are capped by
// `maxNextDays` (days remaining until today), so a fling near the clamp
// commits a partial page instead of overshooting into the future.
export function resolvePanSettle(options: {
  dx: number;
  velocityX: number;
  viewportWidth: number;
  spanDays: number;
  maxNextDays: number;
}): PanSettleResolution {
  const { dx, velocityX, viewportWidth, spanDays, maxNextDays } = options;
  const towardNext = dx < 0;

  if (towardNext && maxNextDays <= 0) {
    return { kind: "stay" };
  }

  const byFling =
    Math.abs(velocityX) >= FLING_VELOCITY_PX_PER_MS &&
    Math.abs(dx) >= FLING_MIN_DISTANCE_PX &&
    velocityX < 0 === towardNext;
  const byDistance =
    viewportWidth > 0 &&
    Math.abs(dx) >= viewportWidth * PAGE_COMMIT_DISTANCE_RATIO;

  if (!byFling && !byDistance) {
    return { kind: "stay" };
  }

  // Momentum pages by the full span; a controlled slide steps one day.
  const desiredDays = byFling ? spanDays : 1;
  const direction = towardNext ? "next" : "prev";
  const days =
    direction === "next" ? Math.min(desiredDays, maxNextDays) : desiredDays;

  return { kind: "commit", direction, days };
}

export type PanSample = {
  t: number;
  x: number;
};

// Release velocity (px/ms) over the trailing sample window, so a drag that
// slowed to a stop before release doesn't read as a fling.
export function computeReleaseVelocity(
  samples: PanSample[],
  releaseT: number,
  releaseX: number,
): number {
  if (samples.length === 0) {
    return 0;
  }

  const cutoff = releaseT - VELOCITY_WINDOW_MS;
  let reference = samples[samples.length - 1];
  for (const sample of samples) {
    if (sample.t >= cutoff) {
      reference = sample;
      break;
    }
  }

  const dt = releaseT - reference.t;
  return dt > 0 ? (releaseX - reference.x) / dt : 0;
}
