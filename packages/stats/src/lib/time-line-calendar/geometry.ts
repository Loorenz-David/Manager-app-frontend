// Pixel geometry for the 24-hour calendar grid. The vertical scale
// (`pxPerHour`) is a RUNTIME value driven by the zoom state, not a constant —
// every position/height derives from it, so zooming keeps events, markers,
// gutter and the now-line perfectly aligned. Functions take `pxPerMinute` so
// they stay pure and testable at any scale.

// Default scale (1.6 px/min): a 15-min block is ~24px, a 19-min pause ~30px.
export const DEFAULT_PX_PER_HOUR = 96;
// Zoom range: compressed (whole day ~one screen) → expanded enough that a
// 2-min event clears one text line (10 px/min → 20px).
export const MIN_PX_PER_HOUR = 40;
export const MAX_PX_PER_HOUR = 600;
// Multiplier per +/- button press (pinch is continuous).
export const ZOOM_STEP = 1.4;

// Very short events keep a visible sliver…
export const MIN_EVENT_VISUAL_PX = 4;
// …while their tap target stays usable via a separate overlay (never inflate
// the visual height — the overlay is the hit area).
export const MIN_EVENT_HIT_PX = 32;

// Completion markers closer than this (in minutes) group into one pill.
export const MARKER_GROUP_THRESHOLD_MINUTES = 8;

export function clampPxPerHour(pxPerHour: number): number {
  return Math.min(MAX_PX_PER_HOUR, Math.max(MIN_PX_PER_HOUR, pxPerHour));
}

export function pxPerMinuteOf(pxPerHour: number): number {
  return pxPerHour / 60;
}

export function dayHeightPxOf(pxPerHour: number): number {
  return 24 * pxPerHour;
}

// How many text lines an event block can show at a given pixel height without
// half-cutting the last one (content is 12px/16px text with a 2px gap inside
// 8px vertical padding). The block renders only this many lines, dropping the
// least important from the bottom — never clipping a partial line.
export function eventLineBudget(heightPx: number): number {
  if (heightPx >= 58) {
    return 3;
  }
  if (heightPx >= 40) {
    return 2;
  }
  if (heightPx >= 20) {
    return 1;
  }
  return 0;
}

export function minuteToOffsetPx(minute: number, pxPerMinute: number): number {
  return minute * pxPerMinute;
}

export type EventLayout = {
  top: number;
  height: number;
  hitTop: number;
  hitHeight: number;
};

export function computeEventLayout(
  startMinute: number,
  endMinute: number,
  pxPerMinute: number,
): EventLayout {
  const dayHeight = 24 * 60 * pxPerMinute;
  const top = startMinute * pxPerMinute;
  const rawHeight = (endMinute - startMinute) * pxPerMinute;
  const height = Math.max(rawHeight, MIN_EVENT_VISUAL_PX);

  const hitHeight = Math.max(height, MIN_EVENT_HIT_PX);
  // Center the enlarged hit area on the visual block, clamped into the day.
  const hitTop = Math.max(
    0,
    Math.min(top - (hitHeight - height) / 2, dayHeight - hitHeight),
  );

  return { top, height, hitTop, hitHeight };
}

// Marker offset INSIDE an event block (px from the event's top), clipped so a
// completion whose timestamp lies outside the drawn slice never renders
// outside the event bounds.
export function markerOffsetWithinEventPx(
  markerMinute: number,
  eventStartMinute: number,
  eventEndMinute: number,
  pxPerMinute: number,
): number {
  const clipped = Math.min(
    Math.max(markerMinute, eventStartMinute),
    eventEndMinute,
  );

  return (clipped - eventStartMinute) * pxPerMinute;
}

// Group near-coincident marker minutes so overlapping pills collapse into one
// "N completed" pill. Input need not be sorted; output is sorted by minute.
export function groupMarkerMinutes<T extends { minute: number }>(
  markers: T[],
  thresholdMinutes: number = MARKER_GROUP_THRESHOLD_MINUTES,
): { minute: number; items: T[] }[] {
  const sorted = [...markers].sort((a, b) => a.minute - b.minute);
  const groups: { minute: number; items: T[] }[] = [];

  for (const marker of sorted) {
    const last = groups[groups.length - 1];
    if (last && marker.minute - last.items[last.items.length - 1].minute <= thresholdMinutes) {
      last.items.push(marker);
      continue;
    }
    groups.push({ minute: marker.minute, items: [marker] });
  }

  return groups;
}
