import { describe, expect, it } from 'vitest';
import { mockClockOutAnalytics, mockFloorRoster } from '@beyo/worker-shifts/mocks';
import { defaultSummaryExtrasAdapters } from './summary-extras-adapters';

const context = {
  analytics: mockClockOutAnalytics,
  user: mockFloorRoster[0]!,
  timeZone: 'Europe/Stockholm',
};

describe('defaultSummaryExtrasAdapters', () => {
  it('maps completed_items to SummaryItems', () => {
    expect(defaultSummaryExtrasAdapters.items(context)).toEqual({
      items: [
        { id: 'itm_hex_bolt', reference: 'ART-10482', imageUrl: 'https://example.com/hex-bolt.png', units: 4 },
        { id: 'itm_rail_bracket', reference: 'ART-20911', imageUrl: null, units: 3 },
      ],
      totalUnits: 7,
      lineCount: 2,
    });
  });

  it('maps week days, flags today by the analytics date, and hard-codes the target', () => {
    const week = defaultSummaryExtrasAdapters.week(context);

    expect(week?.targetSeconds).toBe(40 * 3_600);
    expect(week?.loggedSeconds).toBe(
      mockClockOutAnalytics.week.totals.working_seconds,
    );
    expect(week?.days.map((d) => [d.date, d.isToday])).toEqual([
      ['2026-07-27', false],
      ['2026-07-28', false],
      ['2026-07-29', true],
    ]);
  });

  it('maps rate, passing a null baseline through untouched', () => {
    expect(defaultSummaryExtrasAdapters.rate(context)).toEqual({
      unitsPerHour: 17.3,
      baseline: 15.9,
      baselineDays: 5,
    });

    const noBaselineContext = {
      ...context,
      analytics: {
        ...mockClockOutAnalytics,
        rate: { units_per_hour: 5, baseline_units_per_hour: null, baseline_days: 0 },
      },
    };
    expect(defaultSummaryExtrasAdapters.rate(noBaselineContext)).toEqual({
      unitsPerHour: 5,
      baseline: null,
      baselineDays: 0,
    });
  });

  it('produces empty-but-valid shapes when analytics arrays are empty', () => {
    const emptyContext = {
      ...context,
      analytics: {
        ...mockClockOutAnalytics,
        completed_items: [],
        week: { days: [], totals: { working_seconds: 0, pause_seconds: 0, idle_seconds: 0 } },
      },
    };

    expect(defaultSummaryExtrasAdapters.items(emptyContext)).toEqual({
      items: [],
      totalUnits: 0,
      lineCount: 0,
    });
    expect(defaultSummaryExtrasAdapters.week(emptyContext)?.days).toEqual([]);
  });
});
