import { describe, expect, it } from 'vitest';
import type { ClockOutAnalytics } from '@beyo/worker-shifts';
import { mockClockOutAnalytics } from '@beyo/worker-shifts/mocks';
import { toClockOutSummaryViewModel } from './analytics-view-model';

const options = {
  clockedInAt: '2026-07-29T06:58:00Z',
  clockedOutAt: '2026-07-29T15:10:00Z',
  timeZone: 'Europe/Stockholm',
  now: new Date('2026-07-29T12:00:00.000Z'),
};

function analyticsFixture(): ClockOutAnalytics {
  return structuredClone(mockClockOutAnalytics);
}

describe('toClockOutSummaryViewModel', () => {
  it('builds IN/OUT and worked from the client-captured clock timestamps', () => {
    const result = toClockOutSummaryViewModel(analyticsFixture(), options);

    expect(result).toEqual({
      dateLabel: 'Wednesday 29 July',
      worked: {
        worked: '8h 12m',
        in: '08:58',
        out: '17:10',
      },
    });
  });

  it('ignores analytics bucket totals entirely for the worked span', () => {
    const analytics = analyticsFixture();
    analytics.timeline.working_seconds = 60;
    analytics.timeline.pause_seconds = 999_999;

    expect(toClockOutSummaryViewModel(analytics, options)?.worked).toEqual({
      worked: '8h 12m',
      in: '08:58',
      out: '17:10',
    });
  });

  it('uses the client date in the workspace zone when UTC crosses midnight', () => {
    expect(
      toClockOutSummaryViewModel(analyticsFixture(), {
        ...options,
        timeZone: 'Asia/Jerusalem',
        now: new Date('2026-07-29T21:30:00.000Z'),
      })?.dateLabel,
    ).toBe('Thursday 30 July');
  });

  it('keeps the hero when only the client date label is unusable', () => {
    expect(
      toClockOutSummaryViewModel(analyticsFixture(), {
        ...options,
        now: new Date(Number.NaN),
      }),
    ).toMatchObject({
      dateLabel: null,
      worked: { worked: '8h 12m' },
    });
  });

  it('ignores additive keys on the analytics object', () => {
    const analytics = analyticsFixture() as ClockOutAnalytics &
      Record<string, unknown>;
    analytics.future_key = { ignored: true };

    expect(toClockOutSummaryViewModel(analytics, options)).toMatchObject({
      worked: { worked: '8h 12m' },
    });
  });

  it('degrades null analytics to the plain path', () => {
    expect(toClockOutSummaryViewModel(null, options)).toBeNull();
  });

  it('degrades to the plain path when the pre-action shift start is missing', () => {
    expect(
      toClockOutSummaryViewModel(analyticsFixture(), {
        ...options,
        clockedInAt: null,
      }),
    ).toBeNull();
  });
});
