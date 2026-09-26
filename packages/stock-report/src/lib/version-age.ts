const DAY_MS = 24 * 60 * 60 * 1000;

function localDayStart(value: number): number {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Whole local calendar days a version has been (or was) open: from the day it
 * became active to today, or to the day it closed. Calendar days, not 24-hour
 * blocks, so a version opened last night reads "1 day running" this morning —
 * the same rule `@beyo/lib`'s `daysUntil` applies to due dates. Takes `now`
 * rather than reading the clock so the label is testable and the hub card and
 * the history list agree on one instant.
 *
 * `null` when a date cannot be parsed; never negative.
 */
export function versionDaysRunning(
  activeAt: string,
  closedAt: string | null,
  now: number,
): number | null {
  const start = new Date(activeAt).getTime();
  const end = closedAt === null ? now : new Date(closedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((localDayStart(end) - localDayStart(start)) / DAY_MS));
}

/**
 * The version's age as the owner asked for it — a count *forward* from the day
 * it opened ("2 days running"), not a distance back from now.
 */
export function formatVersionAge(
  activeAt: string,
  closedAt: string | null,
  now: number,
): string {
  const days = versionDaysRunning(activeAt, closedAt, now);
  if (days === null) return closedAt === null ? "Running" : "Closed";
  if (closedAt === null) {
    if (days === 0) return "Started today";
    return days === 1 ? "1 day running" : `${days} days running`;
  }
  if (days === 0) return "Closed the same day";
  return days === 1 ? "Ran 1 day" : `Ran ${days} days`;
}
