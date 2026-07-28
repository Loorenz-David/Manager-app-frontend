import type { CanvasResizeGesture } from "../components/editor/types";
import type { TimelineBarGesture } from "../components/timeline/types";

export const MIN_TIMELINE_WINDOW_MS = 400;
export const MIN_CANVAS_ELEMENT_SIZE = 0.05;

export type TimelineWindow = { startMs: number; endMs: number };
export type CanvasPosition = { x: number; y: number };
export type CanvasElementLayout = CanvasPosition & { width: number; height: number };

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export function timeToX(timeMs: number, durationMs: number, laneWidthPx: number): number {
  if (durationMs <= 0 || laneWidthPx <= 0) return 0;
  return clamp(timeMs / durationMs, 0, 1) * laneWidthPx;
}

export function xToTime(xPx: number, durationMs: number, laneWidthPx: number): number {
  if (durationMs <= 0 || laneWidthPx <= 0) return 0;
  return Math.round(clamp(xPx / laneWidthPx, 0, 1) * durationMs);
}

export function scrubFractionToTime(fraction: number, durationMs: number): number {
  return Math.round(clamp(fraction, 0, 1) * Math.max(0, durationMs));
}

export function timelineWindowFractions(
  window: TimelineWindow,
  durationMs: number,
): { leftFraction: number; widthFraction: number } {
  if (durationMs <= 0) return { leftFraction: 0, widthFraction: 0 };
  return {
    leftFraction: clamp(window.startMs / durationMs, 0, 1),
    widthFraction: clamp((window.endMs - window.startMs) / durationMs, 0, 1),
  };
}

export function clampWindowToDuration(
  window: TimelineWindow,
  durationMs: number,
  minimumWindowMs = MIN_TIMELINE_WINDOW_MS,
): TimelineWindow {
  const duration = Math.max(0, Math.round(durationMs));
  const minimum = Math.min(duration, Math.max(0, minimumWindowMs));
  const endMs = clamp(Math.round(window.endMs), minimum, duration);
  const startMs = clamp(Math.round(window.startMs), 0, endMs - minimum);
  return { startMs, endMs };
}

export function applyTimelineGesture(
  base: TimelineWindow,
  gesture: TimelineBarGesture,
  durationMs: number,
  minimumWindowMs = MIN_TIMELINE_WINDOW_MS,
): TimelineWindow {
  if (gesture.laneWidthPx <= 0 || durationMs <= 0) {
    return clampWindowToDuration(base, durationMs, minimumWindowMs);
  }
  const deltaMs = Math.round((gesture.deltaPx / gesture.laneWidthPx) * durationMs);
  const normalized = clampWindowToDuration(base, durationMs, minimumWindowMs);
  const length = normalized.endMs - normalized.startMs;

  if (gesture.kind === "move") {
    const startMs = clamp(normalized.startMs + deltaMs, 0, durationMs - length);
    return { startMs, endMs: startMs + length };
  }
  if (gesture.kind === "resize-start") {
    return {
      startMs: clamp(normalized.startMs + deltaMs, 0, normalized.endMs - minimumWindowMs),
      endMs: normalized.endMs,
    };
  }
  return {
    startMs: normalized.startMs,
    endMs: clamp(normalized.endMs + deltaMs, normalized.startMs + minimumWindowMs, durationMs),
  };
}

/** Coarsest-first ladder; one second stays the finest step so short slides read as before. */
const TICK_STEPS_MS = [
  1_000, 2_000, 5_000, 10_000, 15_000, 30_000,
  60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
];
const TARGET_TICK_COUNT = 12;

const tickLabel = (timeMs: number): string => {
  const seconds = timeMs / 1_000;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds - minutes * 60)).padStart(2, "0")}`;
};

/**
 * Tick spacing scales with the slide: durations are unbounded, and one label per second
 * turns a minutes-long slide's ruler into an unreadable smear.
 */
export function generateTimelineTicks(durationMs: number): { label: string; fraction: number }[] {
  if (durationMs <= 0) return [];
  const ideal = durationMs / TARGET_TICK_COUNT;
  const stepMs = TICK_STEPS_MS.find((step) => step >= ideal) ?? TICK_STEPS_MS.at(-1)!;
  const ticks: { label: string; fraction: number }[] = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += stepMs) {
    ticks.push({ label: tickLabel(timeMs), fraction: timeMs / durationMs });
  }
  return ticks;
}

/**
 * Elements may hang off the frame — layouts are center-anchored, so a centre on the edge
 * puts half the box outside. 0..1 is the full range the backend accepts for `x`/`y`
 * (`LayoutConfig._pos_range`); a centre beyond the frame would 422.
 */
export function clampCanvasPosition(x: number, y: number): CanvasPosition {
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
}

/**
 * Text boxes resize on both axes and never aspect-lock: width sets the wrap column,
 * height is the author's. Each dragged edge moves while its opposite edge stays put, and
 * the box may extend past the frame (size capped at the canvas, centre clamped to 0..1 —
 * the range the backend's `LayoutConfig` accepts).
 */
export function resizeTextBox(
  layout: CanvasElementLayout,
  gesture: CanvasResizeGesture,
  minimumSize = MIN_CANVAS_ELEMENT_SIZE,
): CanvasElementLayout {
  const minimum = clamp(minimumSize, Number.EPSILON, 1);
  const width = clamp(layout.width, minimum, 1);
  const height = clamp(layout.height, minimum, 1);
  const growsWest = gesture.handle.includes("w");
  const growsEast = gesture.handle.includes("e");
  const growsNorth = gesture.handle.includes("n");
  const growsSouth = gesture.handle.includes("s");

  const nextWidth = growsEast || growsWest
    ? clamp(width + (growsEast ? gesture.deltaXFraction : -gesture.deltaXFraction), minimum, 1)
    : width;
  const nextHeight = growsSouth || growsNorth
    ? clamp(height + (growsSouth ? gesture.deltaYFraction : -gesture.deltaYFraction), minimum, 1)
    : height;

  const x = growsEast
    ? layout.x - width / 2 + nextWidth / 2
    : growsWest
      ? layout.x + width / 2 - nextWidth / 2
      : layout.x;
  const y = growsSouth
    ? layout.y - height / 2 + nextHeight / 2
    : growsNorth
      ? layout.y + height / 2 - nextHeight / 2
      : layout.y;

  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), width: nextWidth, height: nextHeight };
}

function normalizeCanvasLayout(
  layout: CanvasElementLayout,
  minimumSize: number,
): CanvasElementLayout {
  const minimum = clamp(minimumSize, Number.EPSILON, 1);
  const width = clamp(layout.width, minimum, 1);
  const height = clamp(layout.height, minimum, 1);
  return {
    x: clamp(layout.x, width / 2, 1 - width / 2),
    y: clamp(layout.y, height / 2, 1 - height / 2),
    width,
    height,
  };
}

/** Resolves a raw canvas resize gesture against a center-anchored layout.
 * Edges resize one axis freely. Corners keep the current aspect ratio and use
 * the pointer axis with the larger proportional change. The opposite
 * edge/corner remains fixed while minimum size and canvas bounds are applied. */
export function resizeElementLayout(
  layout: CanvasElementLayout,
  gesture: CanvasResizeGesture,
  minimumSize = MIN_CANVAS_ELEMENT_SIZE,
): CanvasElementLayout {
  const base = normalizeCanvasLayout(layout, minimumSize);
  const minimum = clamp(minimumSize, Number.EPSILON, 1);
  const left = base.x - base.width / 2;
  const right = base.x + base.width / 2;
  const top = base.y - base.height / 2;
  const bottom = base.y + base.height / 2;

  if (gesture.handle === "e") {
    const nextRight = clamp(right + gesture.deltaXFraction, left + minimum, 1);
    return { ...base, x: (left + nextRight) / 2, width: nextRight - left };
  }
  if (gesture.handle === "w") {
    const nextLeft = clamp(left + gesture.deltaXFraction, 0, right - minimum);
    return { ...base, x: (nextLeft + right) / 2, width: right - nextLeft };
  }
  if (gesture.handle === "s") {
    const nextBottom = clamp(bottom + gesture.deltaYFraction, top + minimum, 1);
    return { ...base, y: (top + nextBottom) / 2, height: nextBottom - top };
  }
  if (gesture.handle === "n") {
    const nextTop = clamp(top + gesture.deltaYFraction, 0, bottom - minimum);
    return { ...base, y: (nextTop + bottom) / 2, height: bottom - nextTop };
  }

  const movesEast = gesture.handle === "ne" || gesture.handle === "se";
  const movesSouth = gesture.handle === "se" || gesture.handle === "sw";
  const widthDelta = movesEast ? gesture.deltaXFraction : -gesture.deltaXFraction;
  const heightDelta = movesSouth ? gesture.deltaYFraction : -gesture.deltaYFraction;
  const widthScale = (base.width + widthDelta) / base.width;
  const heightScale = (base.height + heightDelta) / base.height;
  const requestedScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
    ? widthScale
    : heightScale;
  const maximumWidth = movesEast ? 1 - left : right;
  const maximumHeight = movesSouth ? 1 - top : bottom;
  const minimumScale = Math.max(minimum / base.width, minimum / base.height);
  const maximumScale = Math.min(maximumWidth / base.width, maximumHeight / base.height);
  const scale = clamp(requestedScale, minimumScale, maximumScale);
  const width = base.width * scale;
  const height = base.height * scale;

  return {
    x: movesEast ? left + width / 2 : right - width / 2,
    y: movesSouth ? top + height / 2 : bottom - height / 2,
    width,
    height,
  };
}
