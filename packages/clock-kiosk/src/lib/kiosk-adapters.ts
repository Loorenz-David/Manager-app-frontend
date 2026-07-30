import type {
  KioskAdapters,
  KioskAdaptersInput,
  KioskAnnouncement,
  SummaryExtrasAdapterContext,
  SummaryItems,
  SummaryRate,
  SummaryWeek,
} from '../types';

const DEFAULT_ADAPTERS: KioskAdapters = {
  scheduledShift: () => null,
  announcements: () => [],
  summaryExtras: {
    items: () => null,
    week: () => null,
    rate: () => null,
  },
};

export function resolveKioskAdapters(
  adapters?: KioskAdaptersInput,
): KioskAdapters {
  return {
    scheduledShift:
      adapters?.scheduledShift ?? DEFAULT_ADAPTERS.scheduledShift,
    announcements:
      adapters?.announcements ?? DEFAULT_ADAPTERS.announcements,
    summaryExtras: {
      items:
        adapters?.summaryExtras?.items ??
        DEFAULT_ADAPTERS.summaryExtras.items,
      week:
        adapters?.summaryExtras?.week ??
        DEFAULT_ADAPTERS.summaryExtras.week,
      rate:
        adapters?.summaryExtras?.rate ??
        DEFAULT_ADAPTERS.summaryExtras.rate,
    },
  };
}

// The adapter carries an ISO date; the component contract wants display text
// ("29 Jul"). Plain YYYY-MM-DD needs no time zone; unparseable input passes
// through untouched rather than throwing on the result screen.
function formatAnnouncementDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function gateAnnouncements(
  items: KioskAnnouncement[],
): KioskAnnouncement[] {
  return items.slice(0, 3).map((item) => ({
    ...item,
    date: formatAnnouncementDate(item.date),
  }));
}

export function gateSummaryExtras(
  adapters: KioskAdapters['summaryExtras'],
  context: SummaryExtrasAdapterContext,
): {
  items: SummaryItems | null;
  week: SummaryWeek | null;
  rate: SummaryRate | null;
} {
  const items = adapters.items(context);
  const week = adapters.week(context);

  return {
    items: items && items.items.length > 0 ? items : null,
    week: week && week.days.length > 0 ? week : null,
    rate: adapters.rate(context),
  };
}
