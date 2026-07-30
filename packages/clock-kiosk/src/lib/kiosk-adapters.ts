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

export function gateAnnouncements(
  items: KioskAnnouncement[],
): KioskAnnouncement[] {
  return items.length > 0 ? items.slice(0, 3) : [];
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
