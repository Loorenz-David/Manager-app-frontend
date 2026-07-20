// Five-day request-window math for the timeline calendar.
//
// The calendar renders 1 or 3 local dates but loads 5 per request, giving
// margin on both sides so day-by-day navigation stays instant. Moving the
// window IS the pagination mechanism (no limit/offset on the endpoint).

import {
  addDaysToKey,
  endOfLocalDay,
  minDateKey,
  parseLocalDateKey,
  utcDateKeyOfInstant,
} from "./local-date";

export type TimelineViewMode = "day" | "threeDay";

// Local-day span of a loaded/requested window (inclusive keys).
export type TimelineWindow = {
  dateFrom: string;
  dateTo: string;
};

export const WINDOW_SIZE_DAYS = 5;

// Visible dates for a focus date. In threeDay mode the focus is the LAST
// (newest) visible date — matching the date-picker rule "tapping D shows
// D-2, D-1, D" and making the today-clamp natural (focus ≤ today).
export function visibleDatesFor(
  focusDate: string,
  mode: TimelineViewMode,
): string[] {
  if (mode === "day") {
    return [focusDate];
  }

  return [addDaysToKey(focusDate, -2), addDaysToKey(focusDate, -1), focusDate];
}

// Deterministic five-day window around the visible dates, clamped so it never
// extends past today; when the clamp trims the upper side, the lower bound
// shifts back to keep five dates where possible.
export function computeWindow(
  visibleDates: string[],
  todayKey: string,
): TimelineWindow {
  const first = visibleDates[0];
  const last = visibleDates[visibleDates.length - 1];
  // 1 visible date → ±2 margin; 3 visible dates → ±1 margin. Both yield 5.
  const margin = visibleDates.length === 1 ? 2 : 1;

  let dateTo = minDateKey(addDaysToKey(last, margin), todayKey);
  let dateFrom = addDaysToKey(first, -margin);

  const trimmed = spanDays(dateFrom, dateTo);
  if (trimmed < WINDOW_SIZE_DAYS) {
    dateFrom = addDaysToKey(dateFrom, trimmed - WINDOW_SIZE_DAYS);
  }
  // Never let the shift push the window ahead of the visible dates.
  dateFrom = minDateKey(dateFrom, first);
  dateTo = minDateKey(dateTo, todayKey);

  return { dateFrom, dateTo };
}

// Hysteresis rule: keep the loaded window while every visible date is covered
// with ≥1 day of margin toward the past (the future side is exempt when the
// window already touches today — there is nothing newer to load).
export function windowCovers(
  loaded: TimelineWindow | null,
  visibleDates: string[],
  todayKey: string,
): boolean {
  if (!loaded) {
    return false;
  }

  const first = visibleDates[0];
  const last = visibleDates[visibleDates.length - 1];

  const pastOk = addDaysToKey(first, -1) >= loaded.dateFrom;
  const futureOk =
    loaded.dateTo >= todayKey || addDaysToKey(last, 1) <= loaded.dateTo;

  return pastOk && futureOk && first >= loaded.dateFrom && last <= loaded.dateTo;
}

// UTC request dates covering the LOCAL window span. A local day can straddle
// two UTC dates, so each edge derives from the corresponding local instant.
export function requestRangeUtc(window: TimelineWindow): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: utcDateKeyOfInstant(parseLocalDateKey(window.dateFrom)),
    dateTo: utcDateKeyOfInstant(endOfLocalDay(window.dateTo)),
  };
}

function spanDays(fromKey: string, toKey: string): number {
  const from = parseLocalDateKey(fromKey);
  const to = parseLocalDateKey(toKey);

  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
