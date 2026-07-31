import { formatTimeInTimeZone, type ClockOutAnalytics } from '@beyo/worker-shifts';

export type ClockOutSummaryViewModel = {
  dateLabel: string | null;
  worked: {
    worked: string;
    in: string;
    out: string;
  };
};

type AnalyticsViewModelOptions = {
  /** Pre-action `current.shift_started_at` — the day's IN marker. */
  clockedInAt: string | null;
  /** Client-captured moment the clock-out action resolved — the OUT marker. */
  clockedOutAt: string;
  timeZone: string;
  /** Only drives the date label; defaults to now. */
  now?: Date;
};

function formatWorkedSpan(milliseconds: number): string {
  // The displayed IN/OUT values are minute-precision, so the span is floored
  // to the same precision rather than overstating a partial final minute.
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatClientDate(now: Date, timeZone: string): string | null {
  if (!Number.isFinite(now.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone,
    }).format(now);
  } catch {
    return null;
  }
}

/**
 * Pure clock-out analytics → display view-model mapping.
 *
 * Handoff §5.1 removed the segments[] drill-down this used to derive IN/OUT
 * from, and the insights[] trend cards (replaced by the unit-based
 * items/week/rate GAP tiles — see `lib/kiosk-adapters.ts`). Neither the
 * clock-out response nor a not-clocked-in `/current` carries a clock-out
 * timestamp, so the worked span is built from the two client-captured
 * moments the controller threads through: the pre-action shift start and the
 * moment the action resolved.
 */
export function toClockOutSummaryViewModel(
  analytics: ClockOutAnalytics | null,
  { clockedInAt, clockedOutAt, timeZone, now = new Date() }: AnalyticsViewModelOptions,
): ClockOutSummaryViewModel | null {
  if (!analytics) return null;
  if (!clockedInAt || !Number.isFinite(Date.parse(clockedInAt))) return null;
  if (!Number.isFinite(Date.parse(clockedOutAt))) return null;

  const startedAt = Date.parse(clockedInAt);
  const endedAt = Date.parse(clockedOutAt);
  const dateLabel = formatClientDate(now, timeZone);

  return {
    dateLabel,
    worked: {
      worked: formatWorkedSpan(endedAt - startedAt),
      in: formatTimeInTimeZone(clockedInAt, timeZone),
      out: formatTimeInTimeZone(clockedOutAt, timeZone),
    },
  };
}
