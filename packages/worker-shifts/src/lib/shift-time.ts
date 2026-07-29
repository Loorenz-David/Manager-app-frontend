export const MORNING_START_HOUR = 5;
export const AFTERNOON_START_HOUR = 12;
export const EVENING_START_HOUR = 18;

export type DayPartGreeting = "morning" | "afternoon" | "evening";

export function elapsedSecondsSince(
  started_at: string | null,
  now: Date = new Date(),
): number | null {
  if (started_at === null) {
    return null;
  }

  const startedAtMs = Date.parse(started_at);
  if (!Number.isFinite(startedAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000));
}

export function formatElapsedDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatTimeInTimeZone(
  timestamp: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export function firstName(username: string): string {
  return username.trim().split(/\s+/u)[0] ?? "";
}

export function dayPartGreeting(
  timeZone: string,
  now: Date = new Date(),
): DayPartGreeting {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour");

  const hour = Number(hourPart?.value);

  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) {
    return "morning";
  }
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) {
    return "afternoon";
  }
  return "evening";
}
