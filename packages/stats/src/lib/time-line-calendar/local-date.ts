// Local-wall-clock date helpers for the timeline calendar.
//
// Display policy (see PLAN_worker_timeline_calendar_20260719): day columns,
// hour axis, and the now-line are LOCAL wall-clock; only the API request dates
// are UTC calendar dates. A "date key" is a `YYYY-MM-DD` string naming a LOCAL
// calendar day. Minutes are computed from local clock components — never from
// millisecond deltas — so DST days position correctly.

const MINUTES_PER_DAY = 24 * 60;

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Local midnight of the named local day.
export function parseLocalDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function addDaysToKey(key: string, days: number): string {
  const date = parseLocalDateKey(key);
  date.setDate(date.getDate() + days);

  return localDateKey(date);
}

export function todayLocalKey(now: Date = new Date()): string {
  return localDateKey(now);
}

// ISO `YYYY-MM-DD` strings compare correctly as plain strings.
export function minDateKey(a: string, b: string): string {
  return a <= b ? a : b;
}

// Whole calendar days from `fromKey` to `toKey` (positive when `toKey` is
// later). Rounding absorbs DST-shifted day lengths.
export function diffInDays(fromKey: string, toKey: string): number {
  return Math.round(
    (parseLocalDateKey(toKey).getTime() - parseLocalDateKey(fromKey).getTime()) /
      86_400_000,
  );
}

export function maxDateKey(a: string, b: string): string {
  return a >= b ? a : b;
}

// Fractional minute of the LOCAL day (0 ≤ m < 1440).
export function minuteOfLocalDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export { MINUTES_PER_DAY };

// UTC calendar date of an instant — the backend's date vocabulary.
export function utcDateKeyOfInstant(instant: Date): string {
  const year = instant.getUTCFullYear();
  const month = String(instant.getUTCMonth() + 1).padStart(2, "0");
  const day = String(instant.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Last instant of the named local day (start of next day minus 1ms).
export function endOfLocalDay(key: string): Date {
  const next = parseLocalDateKey(addDaysToKey(key, 1));

  return new Date(next.getTime() - 1);
}

// "HH:mm" local wall-clock label.
export function formatLocalTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}
