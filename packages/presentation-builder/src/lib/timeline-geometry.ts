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

export function generateTimelineTicks(durationMs: number): { label: string; fraction: number }[] {
  if (durationMs <= 0) return [];
  return Array.from({ length: Math.floor(durationMs / 1_000) + 1 }, (_, second) => ({
    label: `${second}s`,
    fraction: (second * 1_000) / durationMs,
  }));
}

export function clampCanvasPosition(x: number, y: number): CanvasPosition {
  return { x: clamp(x, 0.05, 0.95), y: clamp(y, 0.06, 0.94) };
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
