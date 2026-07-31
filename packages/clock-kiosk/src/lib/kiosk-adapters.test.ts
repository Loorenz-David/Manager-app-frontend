import { describe, expect, it, vi } from 'vitest';
import {
  mockClockOutAnalytics,
  mockFloorRoster,
} from '@beyo/worker-shifts/mocks';
import { showcaseKioskAdapters } from '../adapters/showcase-kiosk-adapters';
import {
  gateAnnouncements,
  gateSummaryExtras,
  resolveKioskAdapters,
} from './kiosk-adapters';

const context = {
  analytics: mockClockOutAnalytics,
  user: mockFloorRoster[0]!,
  timeZone: 'Europe/Stockholm',
  currentShift: null,
};

describe('resolveKioskAdapters', () => {
  it('ships scheduledShift/announcements defaults as null and empty', () => {
    const adapters = resolveKioskAdapters();

    expect(adapters.scheduledShift(context)).toBeNull();
    expect(adapters.announcements(context)).toEqual([]);
  });

  it('ships summaryExtras defaults derived from the analytics response itself', () => {
    const adapters = resolveKioskAdapters();

    expect(adapters.summaryExtras.items(context)).toMatchObject({
      totalUnits: 7,
      lineCount: 2,
    });
    expect(adapters.summaryExtras.week(context)).toMatchObject({
      loggedSeconds: mockClockOutAnalytics.week.totals.working_seconds,
    });
    expect(adapters.summaryExtras.rate(context)).toEqual({
      unitsPerHour: 17.3,
      baseline: 15.9,
      baselineDays: 5,
    });
  });

  it('merges a partial summary adapter override without disturbing sibling GAPs', () => {
    const rate = vi.fn(() => ({
      unitsPerHour: 4,
      baseline: 3,
      baselineDays: 5,
    }));
    const adapters = resolveKioskAdapters({ summaryExtras: { rate } });

    expect(adapters.summaryExtras.items(context)).toMatchObject({
      totalUnits: 7,
    });
    expect(adapters.summaryExtras.rate(context)).toEqual({
      unitsPerHour: 4,
      baseline: 3,
      baselineDays: 5,
    });
  });

  it('falls back per key when a partial summary adapter contains undefined', () => {
    const adapters = resolveKioskAdapters({
      summaryExtras: { items: undefined },
    });

    expect(adapters.summaryExtras.items(context)).toMatchObject({
      totalUnits: 7,
    });
    expect(() =>
      gateSummaryExtras(adapters.summaryExtras, context),
    ).not.toThrow();
  });
});

describe('adapter gating', () => {
  it('omits empty items/week and retains an independently present rate', () => {
    const extras = gateSummaryExtras(
      {
        items: () => ({ items: [], totalUnits: 0, lineCount: 0 }),
        week: () => ({
          days: [],
          targetSeconds: 144_000,
          loggedSeconds: 0,
        }),
        rate: () => ({
          unitsPerHour: 17.3,
          baseline: 15.9,
          baselineDays: 5,
        }),
      },
      context,
    );

    expect(extras).toEqual({
      items: null,
      week: null,
      rate: {
        unitsPerHour: 17.3,
        baseline: 15.9,
        baselineDays: 5,
      },
    });
  });

  it('omits empty announcements and caps populated announcements at three', () => {
    expect(gateAnnouncements([])).toEqual([]);
    const announcements = showcaseKioskAdapters.announcements();
    expect(
      gateAnnouncements([
        ...announcements,
        { ...announcements[0]!, id: 'fourth' },
      ]),
    ).toHaveLength(3);
  });

  it('showcase adapters light up every design-ahead GAP', () => {
    const adapters = resolveKioskAdapters(showcaseKioskAdapters);

    expect(adapters.scheduledShift(context)).not.toBeNull();
    expect(gateAnnouncements(adapters.announcements(context))).toHaveLength(3);
    expect(gateSummaryExtras(adapters.summaryExtras, context)).toMatchObject({
      items: { totalUnits: 142 },
      week: { targetSeconds: 144_000 },
      rate: { unitsPerHour: 17.3 },
    });
  });
});
