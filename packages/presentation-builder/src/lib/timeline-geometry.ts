import type { TimelineBarGesture } from "../components/timeline/types";

export const MIN_TIMELINE_WINDOW_MS = 400;

export type TimelineWindow = { startMs: number; endMs: number };
export type CanvasPosition = { x: number; y: number };

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
