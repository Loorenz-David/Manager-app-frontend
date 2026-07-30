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
  it('ships production defaults as null and empty', () => {
    const adapters = resolveKioskAdapters();

    expect(adapters.scheduledShift(context)).toBeNull();
    expect(adapters.announcements(context)).toEqual([]);
    expect(adapters.summaryExtras.items(context)).toBeNull();
    expect(adapters.summaryExtras.week(context)).toBeNull();
    expect(adapters.summaryExtras.rate(context)).toBeNull();
  });

  it('merges a partial summary adapter without enabling sibling GAPs', () => {
    const rate = vi.fn(() => ({
      unitsPerHour: 4,
      baseline: 3,
      baselineDays: 5,
    }));
    const adapters = resolveKioskAdapters({ summaryExtras: { rate } });

    expect(adapters.summaryExtras.items(context)).toBeNull();
    expect(adapters.summaryExtras.week(context)).toBeNull();
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

    expect(adapters.summaryExtras.items(context)).toBeNull();
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
