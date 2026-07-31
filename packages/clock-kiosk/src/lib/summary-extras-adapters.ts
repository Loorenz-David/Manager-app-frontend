import type { SummaryExtrasAdapter, SummaryExtrasAdapterContext } from '../types';

/**
 * Handoff §5.1: "no `scheduled_seconds`, ever — any 'of 40h scheduled'
 * target must be omitted or hard-coded client-side." A weekly target isn't a
 * backend concept in this system, so this is the one place to change it.
 */
export const DEFAULT_WEEKLY_TARGET_HOURS = 40;

function weekDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

/**
 * The default `summaryExtras` adapter set. Unlike `scheduledShift` or
 * `announcements`, items/week/rate need no host-owned query — the backend
 * embeds `completed_items`/`week`/`rate` directly in the clock-out response
 * (handoff §5.1), so this is a pure, universal mapping every host gets for
 * free. A host may still override individual keys via `KioskAdaptersInput`.
 */
export const defaultSummaryExtrasAdapters: SummaryExtrasAdapter = {
  items: ({ analytics }: SummaryExtrasAdapterContext) => ({
    items: analytics.completed_items.map((item) => ({
      id: item.item_id,
      reference: item.reference,
      imageUrl: item.image_url,
      units: item.units,
    })),
    totalUnits: analytics.completed_items.reduce(
      (sum, item) => sum + item.units,
      0,
    ),
    lineCount: analytics.completed_items.length,
  }),

  week: ({ analytics }: SummaryExtrasAdapterContext) => ({
    days: analytics.week.days.map((day) => ({
      date: day.date,
      label: weekDayLabel(day.date),
      workedSeconds: day.working_seconds,
      isToday: day.date === analytics.date,
    })),
    targetSeconds: DEFAULT_WEEKLY_TARGET_HOURS * 3_600,
    loggedSeconds: analytics.week.totals.working_seconds,
  }),

  rate: ({ analytics }: SummaryExtrasAdapterContext) => ({
    unitsPerHour: analytics.rate.units_per_hour,
    baseline: analytics.rate.baseline_units_per_hour,
    baselineDays: analytics.rate.baseline_days,
  }),
};
