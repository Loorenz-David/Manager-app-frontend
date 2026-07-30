import type {
  ClockOutAnalytics,
  CurrentShift,
  FloorRosterUser,
} from '@beyo/worker-shifts';

export type ScheduledShiftDisplay = {
  start: string;
  end: string;
} | null;

export type KioskAnnouncement = {
  id: string;
  title: string;
  body: string;
  accent: 'info' | 'success' | 'neutral';
  date: string;
};

export type SummaryCompletedItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  units: number;
};

export type SummaryItems = {
  items: SummaryCompletedItem[];
  totalUnits: number;
  lineCount: number;
};

export type SummaryWeekDay = {
  date: string;
  label: string;
  workedSeconds: number;
  isToday: boolean;
};

export type SummaryWeek = {
  days: SummaryWeekDay[];
  targetSeconds: number;
  loggedSeconds: number;
};

export type SummaryRate = {
  unitsPerHour: number;
  baseline: number;
  baselineDays: number;
};

export type ScheduledShiftAdapter = (context: {
  user: FloorRosterUser;
  timeZone: string;
  currentShift: CurrentShift | null;
}) => ScheduledShiftDisplay;

/**
 * Synchronous presentation seam. A host with endpoint-backed announcements
 * owns the query and passes its current query data through this adapter.
 */
export type AnnouncementsAdapter = (context: {
  user: FloorRosterUser;
  timeZone: string;
}) => KioskAnnouncement[];

export type SummaryExtrasAdapterContext = {
  analytics: ClockOutAnalytics;
  user: FloorRosterUser;
  timeZone: string;
};

export type SummaryExtrasAdapter = {
  items: (context: SummaryExtrasAdapterContext) => SummaryItems | null;
  week: (context: SummaryExtrasAdapterContext) => SummaryWeek | null;
  rate: (context: SummaryExtrasAdapterContext) => SummaryRate | null;
};

export type KioskAdapters = {
  scheduledShift: ScheduledShiftAdapter;
  announcements: AnnouncementsAdapter;
  summaryExtras: SummaryExtrasAdapter;
};

export type KioskAdaptersInput = Partial<
  Omit<KioskAdapters, 'summaryExtras'>
> & {
  summaryExtras?: Partial<SummaryExtrasAdapter>;
};
