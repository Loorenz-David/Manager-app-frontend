import { describe, expect, it } from 'vitest';
import type { ClockOutAnalytics } from '@beyo/worker-shifts';
import { mockClockOutAnalytics } from '@beyo/worker-shifts/mocks';
import {
  formatInsightAbsoluteDelta,
  toClockOutSummaryViewModel,
} from './analytics-view-model';

const options = {
  timeZone: 'Europe/Stockholm',
  now: new Date('2026-07-29T12:00:00.000Z'),
};

function analyticsFixture(): ClockOutAnalytics {
  return structuredClone(mockClockOutAnalytics);
}

describe('toClockOutSummaryViewModel', () => {
  it('maps IN/OUT and worked from markers instead of summing buckets', () => {
    const analytics = analyticsFixture();
    analytics.timeline.working_seconds = 60;
    analytics.timeline.pause_seconds = 999_999;

    const result = toClockOutSummaryViewModel(analytics, options);

    expect(result).toMatchObject({
      dateLabel: 'Wednesday 29 July',
      worked: {
        worked: '8h 12m',
        in: '08:58',
        out: '17:10',
      },
    });
  });

  it('uses the last start before the final end and tolerates truncation', () => {
    const analytics = analyticsFixture();
    analytics.segments_truncated = true;
    analytics.segments.unshift({
      ...analytics.segments[0]!,
      start: '2026-07-29T06:30:00Z',
      end: '2026-07-29T06:30:00Z',
    });
    analytics.segments.push({
      ...analytics.segments.at(-1)!,
      start: '2026-07-29T15:30:00Z',
      end: '2026-07-29T15:30:00Z',
    });

    expect(toClockOutSummaryViewModel(analytics, options)?.worked).toEqual({
      worked: '8h 32m',
      in: '08:58',
      out: '17:30',
    });
  });

  it('pairs the final end with the last start on a two-shift day', () => {
    const analytics = analyticsFixture();
    analytics.segments = [
      {
        ...analytics.segments[0]!,
        start: '2026-07-29T05:00:00Z',
        end: '2026-07-29T05:00:00Z',
      },
      {
        ...analytics.segments.at(-1)!,
        start: '2026-07-29T08:00:00Z',
        end: '2026-07-29T08:00:00Z',
      },
      {
        ...analytics.segments[0]!,
        start: '2026-07-29T14:00:00Z',
        end: '2026-07-29T14:00:00Z',
      },
      {
        ...analytics.segments.at(-1)!,
        start: '2026-07-29T17:00:00Z',
        end: '2026-07-29T17:00:00Z',
      },
    ];

    expect(toClockOutSummaryViewModel(analytics, options)?.worked).toEqual({
      worked: '3h 0m',
      in: '16:00',
      out: '19:00',
    });
  });

  it('uses the client date in the workspace zone when UTC crosses midnight', () => {
    expect(
      toClockOutSummaryViewModel(analyticsFixture(), {
        timeZone: 'Asia/Jerusalem',
        now: new Date('2026-07-29T21:30:00.000Z'),
      })?.dateLabel,
    ).toBe('Thursday 30 July');
  });

  it('uses authored worker copy and formats percentage polarity', () => {
    const analytics = analyticsFixture();
    analytics.insights = [
      {
        code: 'completion_surge',
        polarity: 'positive',
        metric: 'completed_count',
        target_value: 8,
        baseline_value: 3,
        delta: 5,
        delta_pct: 9.1,
        sample_size: 4,
        severity: 'high',
      },
    ];

    expect(toClockOutSummaryViewModel(analytics, options)?.insights).toEqual([
      {
        key: 'completion_surge',
        text: '8 steps completed vs your recent average of 3',
        delta: { value: '+9.1%', polarity: 'positive' },
      },
    ]);
  });

  it.each([
    [
      'completion_dip',
      'completed_count',
      4,
      7,
      '4 steps completed vs your recent average of 7',
    ],
    [
      'on_a_roll',
      'streak_days',
      4,
      2,
      '4 days in a row at or above your recent completion bar',
    ],
    [
      'deep_focus',
      'focus_ratio',
      0.825,
      0.75,
      '82.5% of the day spent working vs 75.0% usual',
    ],
    [
      'faster_pace',
      'steps_per_focused_hour',
      4.25,
      3.1,
      '4.3 steps per focused hour vs 3.1 usual',
    ],
    [
      'slower_pace',
      'steps_per_focused_hour',
      2.25,
      3.1,
      '2.3 steps per focused hour vs 3.1 usual',
    ],
    [
      'rising_pauses',
      'avg_pause_seconds',
      660,
      300,
      'Average pause 11m vs 5m usual',
    ],
    [
      'leaving_steps_mid_shift',
      'unfinished_count',
      3.2,
      1.4,
      '3 steps left unfinished at shift end vs 1 usual',
    ],
    [
      'choppy_work',
      'sessions_per_finished_step',
      2.16,
      1.25,
      '2.2 work sessions per finished step vs 1.3 usual',
    ],
    [
      'quality_watch',
      'issue_resolution_ratio',
      0.725,
      0.9,
      '72.5% of raised issues resolved vs 90.0% usual',
    ],
  ])(
    'renders factual kiosk copy for %s',
    (code, metric, targetValue, baselineValue, expected) => {
      const analytics = analyticsFixture();
      analytics.insights = [
        {
          ...analytics.insights[0]!,
          code,
          metric,
          target_value: targetValue,
          baseline_value: baselineValue,
        },
      ];

      expect(
        toClockOutSummaryViewModel(analytics, options)?.insights[0],
      ).toMatchObject({ key: code, text: expected });
    },
  );

  it('renders unknown codes as factual metric/delta copy', () => {
    const result = toClockOutSummaryViewModel(analyticsFixture(), options);

    expect(result?.insights).toEqual([
      {
        key: 'working_time_vs_baseline',
        text:
          'Working time changed by +30m from the recent baseline',
        delta: { value: '+9.1%', polarity: 'positive' },
      },
    ]);
  });

  it('maps additive polarity values to neutral and falls back to absolute deltas', () => {
    const analytics = analyticsFixture();
    analytics.insights = [
      {
        ...analytics.insights[0]!,
        code: 'future_signal',
        polarity: 'future',
        metric: 'completed_count',
        delta: -2,
        delta_pct: Number.NaN,
      },
    ];

    expect(toClockOutSummaryViewModel(analytics, options)?.insights).toEqual([
      {
        key: 'future_signal',
        text:
          'Completed count changed by −2 from the recent baseline',
        delta: { value: '−2', polarity: 'neutral' },
      },
    ]);
  });

  it('keeps authored copy for a known code with neutral polarity', () => {
    const analytics = analyticsFixture();
    analytics.insights = [
      {
        ...analytics.insights[0]!,
        code: 'completion_surge',
        polarity: 'neutral',
        metric: 'completed_count',
        target_value: 8,
        baseline_value: 3,
        delta: 5,
      },
    ];

    expect(
      toClockOutSummaryViewModel(analytics, options)?.insights[0],
    ).toEqual({
      key: 'completion_surge',
      text: '8 steps completed vs your recent average of 3',
      delta: { value: '+9.1%', polarity: 'neutral' },
    });
  });

  it('supplies insight codes as stable keys when copy collides', () => {
    const analytics = analyticsFixture();
    analytics.insights = [
      {
        ...analytics.insights[0]!,
        code: 'future_signal_one',
        metric: 'completed_count',
        delta: 2,
      },
      {
        ...analytics.insights[0]!,
        code: 'future_signal_two',
        metric: 'completed_count',
        delta: 2,
      },
    ];

    expect(
      toClockOutSummaryViewModel(analytics, options)?.insights.map(
        ({ key, text }) => ({ key, text }),
      ),
    ).toEqual([
      {
        key: 'future_signal_one',
        text:
          'Completed count changed by +2 from the recent baseline',
      },
      {
        key: 'future_signal_two',
        text:
          'Completed count changed by +2 from the recent baseline',
      },
    ]);
  });

  it.each(['2026-07-29T00:00:00Z', ''])(
    'keeps the hero when the analytics date is %j',
    (date) => {
      const analytics = analyticsFixture();
      analytics.date = date;

      expect(
        toClockOutSummaryViewModel(analytics, options),
      ).toMatchObject({
        dateLabel: 'Wednesday 29 July',
        worked: { worked: '8h 12m' },
      });
    },
  );

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

  it('keeps a usable hero when insights are empty and ignores additive keys', () => {
    const analytics = analyticsFixture() as ClockOutAnalytics &
      Record<string, unknown>;
    analytics.insights = [];
    analytics.future_key = { ignored: true };

    expect(toClockOutSummaryViewModel(analytics, options)).toMatchObject({
      worked: { worked: '8h 12m' },
      insights: [],
    });
  });

  it('degrades null or marker-incomplete analytics to the plain path', () => {
    const withoutStart = analyticsFixture();
    withoutStart.segments = withoutStart.segments.filter(
      ({ state }) => state !== 'started_shift',
    );
    const withoutEnd = analyticsFixture();
    withoutEnd.segments = withoutEnd.segments.filter(
      ({ state }) => state !== 'ended_shift',
    );

    expect(toClockOutSummaryViewModel(null, options)).toBeNull();
    expect(toClockOutSummaryViewModel(withoutStart, options)).toBeNull();
    expect(toClockOutSummaryViewModel(withoutEnd, options)).toBeNull();
  });
});

describe('formatInsightAbsoluteDelta', () => {
  it.each([
    ['working_seconds', 1_800, '+30m'],
    ['pause_seconds', -3_600, '−1h'],
    ['completed_count', 2.4, '+2'],
    ['focus_ratio', -0.14, '−0.1'],
  ])('formats %s delta %s as %s', (metric, delta, expected) => {
    expect(formatInsightAbsoluteDelta(metric, delta)).toBe(expected);
  });
});
