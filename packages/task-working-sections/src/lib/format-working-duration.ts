const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 60 * 24;

// Formats a working-time total as "2h 20m" or "1d 2h 20m"; days (and hours when
// zero and no days) are dropped so short durations stay compact, e.g. "20m".
export function formatWorkingDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (days > 0 || hours > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);

  return parts.join(" ");
}
