/**
 * The schedule sheet's arithmetic (plan §F.5, OC-1): a local day plus a local
 * "HH:MM" become one instant, sent as `toISOString()` (UTC `Z`, which v7 §5.8
 * accepts). Everything is local time — the user schedules "Thursday at six"
 * where they stand.
 */

/** The time a new schedule starts at (OC-1). */
export const DEFAULT_SCHEDULE_TIME = "06:00";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parse(iso: string | null): Date | null {
  if (iso === null) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The schedule's local time as "HH:MM", or the default when there is none. */
export function scheduleTimeOf(iso: string | null): string {
  const date = parse(iso);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : DEFAULT_SCHEDULE_TIME;
}

/** The schedule's local calendar day (midnight), for the calendar's selection. */
export function scheduleDayOf(iso: string | null): Date | undefined {
  const date = parse(iso);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : undefined;
}

/** The local day and time as one ISO instant; `null` when the time is not "HH:MM". */
export function composeScheduleInstant(day: Date, time: string): string | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(match[1]), Number(match[2])).toISOString();
}

/** The same rule as v7 `STOCK_REPORT_SCHEDULE_IN_THE_PAST`: strictly after now. */
export function isFutureInstant(iso: string, now: number): boolean {
  return Date.parse(iso) > now;
}

/** Local midnight of `now` — the calendar disables every day before it. */
export function startOfLocalDay(now: number): Date {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
