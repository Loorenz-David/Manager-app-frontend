import type { KioskAdaptersInput } from '../types';

/**
 * Design-image data for local visual verification only. The production
 * provider defaults remain null/empty; the floor host injects this object only
 * while the single `VITE_FLOOR_MOCKS=1` development flag is active.
 */
export const showcaseKioskAdapters = {
  scheduledShift: () => ({
    start: '2026-07-29T05:00:00.000Z',
    end: '2026-07-29T13:30:00.000Z',
  }),
  announcements: () => [
    {
      id: 'announcement-changeover',
      title: 'Line 3 changeover at 11:00',
      body: 'Swap to the 60mm die set — Priya will run the checklist with you.',
      accent: 'info',
      date: '2026-07-29',
    },
    {
      id: 'announcement-safety-walk',
      title: 'Safety walk today',
      body: 'Keep gangway B clear between 13:00 and 14:00.',
      accent: 'success',
      date: '2026-07-29',
    },
    {
      id: 'announcement-payslips',
      title: 'Payslips are out',
      body: 'June statements are on the noticeboard tablet.',
      accent: 'neutral',
      date: '2026-07-29',
    },
  ],
  summaryExtras: {
    items: () => ({
      totalUnits: 142,
      lineCount: 4,
      items: [
        {
          id: 'item-hex-bolt',
          name: 'Hex bolt M8',
          imageUrl: null,
          units: 52,
        },
        {
          id: 'item-rail-bracket',
          name: 'Rail bracket',
          imageUrl: null,
          units: 38,
        },
        {
          id: 'item-drive-belt',
          name: 'Drive belt 40"',
          imageUrl: null,
          units: 31,
        },
        {
          id: 'item-cap-assembly',
          name: 'Cap assembly',
          imageUrl: null,
          units: 21,
        },
      ],
    }),
    week: () => ({
      targetSeconds: 144_000,
      loggedSeconds: 143_640,
      days: [
        {
          date: '2026-07-27',
          label: 'Mon',
          workedSeconds: 28_800,
          isToday: false,
        },
        {
          date: '2026-07-28',
          label: 'Tue',
          workedSeconds: 28_380,
          isToday: false,
        },
        {
          date: '2026-07-29',
          label: 'Wed',
          workedSeconds: 29_100,
          isToday: true,
        },
        {
          date: '2026-07-30',
          label: 'Thu',
          workedSeconds: 27_840,
          isToday: false,
        },
        {
          date: '2026-07-31',
          label: 'Fri',
          workedSeconds: 29_520,
          isToday: false,
        },
      ],
    }),
    rate: () => ({
      unitsPerHour: 17.3,
      baseline: 15.9,
      baselineDays: 5,
    }),
  },
} satisfies KioskAdaptersInput;
