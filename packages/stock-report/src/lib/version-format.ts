/**
 * Date wording for versions: the creation-day title a version shows when it
 * has none of its own (owner, 2026-09-28: "Thu, 7th July"), the schedule
 * label, and the schedule state. Everything is local time through `Intl`
 * with a fixed English locale, so the wording does not drift with the
 * device locale while the day boundary still follows the device clock.
 *
 * Every function takes `now` so the year suffix and the overdue rule are
 * testable and the drafts page, the hub card and the form agree on one
 * instant.
 */

const LOCALE = "en-GB";

/** `1st`, `2nd`, `3rd`, `4th` … `11th`, `12th`, `13th` … `21st`, `22nd`, `23rd`. */
export function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function yearSuffix(date: Date, now: number): string {
  return date.getFullYear() === new Date(now).getFullYear() ? "" : ` ${date.getFullYear()}`;
}

/**
 * "Thu, 7th July" — the weekday short, the day as an ordinal, the month long;
 * the year appended only when it is not the current one. This is the title a
 * version shows when it was given none, and the form's ghost placeholder, so
 * an untitled version and the placeholder read the same string by
 * construction (OC-7).
 */
export function formatVersionDayTitle(iso: string, now: number = Date.now()): string {
  const date = parse(iso);
  if (!date) return "Untitled version";
  const weekday = date.toLocaleDateString(LOCALE, { weekday: "short" });
  const month = date.toLocaleDateString(LOCALE, { month: "long" });
  return `${weekday}, ${ordinalDay(date.getDate())} ${month}${yearSuffix(date, now)}`;
}

/**
 * "Thu, 7th Oct · 06:00" — a schedule as the user will meet it: local time,
 * month short, the year only when it differs from now.
 */
export function formatScheduleLabel(iso: string, now: number = Date.now()): string {
  const date = parse(iso);
  if (!date) return "Unknown time";
  const weekday = date.toLocaleDateString(LOCALE, { weekday: "short" });
  const month = date.toLocaleDateString(LOCALE, { month: "short" });
  const time = date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${weekday}, ${ordinalDay(date.getDate())} ${month}${yearSuffix(date, now)} · ${time}`;
}

export type StockReportScheduleState = "none" | "pending" | "overdue";

/**
 * Whether a version has a schedule and whether that schedule is already in the
 * past (v7 §5.21: a draft whose scheduled time has passed has not been
 * activated yet — show it as overdue). Only a draft can have a schedule; on
 * any other state the answer is `none`, whatever the field says.
 */
export function versionScheduleState(
  version: { state: string; scheduled_activation_at: string | null },
  now: number = Date.now(),
): StockReportScheduleState {
  if (version.state !== "draft" || version.scheduled_activation_at === null) return "none";
  const due = Date.parse(version.scheduled_activation_at);
  if (Number.isNaN(due)) return "none";
  return due <= now ? "overdue" : "pending";
}

/**
 * Two ISO strings name the same instant. The backend echoes every date as UTC
 * with a `+00:00` offset (v10 §6.7) while the form holds `toISOString()`'s
 * `Z`, so a string comparison would call an untouched schedule "changed".
 * Both `null` is the same (no schedule); one `null` is not.
 */
export function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Date.parse(a) === Date.parse(b);
}
