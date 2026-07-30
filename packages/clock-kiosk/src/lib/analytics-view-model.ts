import { KNOWN_INSIGHT_CODES } from '@beyo/stats/insight-codes';
import {
  formatTimeInTimeZone,
  type AnalyticsInsight,
  type ClockOutAnalytics,
} from '@beyo/worker-shifts';

export type ClockOutInsightViewModel = {
  key: string;
  text: string;
  delta: {
    value: string;
    polarity: 'positive' | 'negative' | 'neutral';
  };
};

export type ClockOutSummaryViewModel = {
  dateLabel: string | null;
  worked: {
    worked: string;
    in: string;
    out: string;
  };
  insights: ClockOutInsightViewModel[];
};

type AnalyticsViewModelOptions = {
  timeZone: string;
  now?: Date;
};

function signed(value: number, suffix = ''): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value)}${suffix}`;
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatSignedPercentage(value: number): string {
  return signed(roundToSingleDecimal(value), '%');
}

function isSecondsMetric(metric: string): boolean {
  return metric.includes('seconds') || metric.endsWith('_time');
}

/**
 * Absolute deltas use the metric's unit: second/time metrics become a compact
 * duration, count metrics become a rounded whole number, and other numeric
 * metrics retain one decimal. Insight badges prefer a finite `delta_pct`;
 * this absolute formatter is the fallback when a percentage is unavailable.
 */
export function formatInsightAbsoluteDelta(
  metric: string,
  delta: number,
): string {
  if (isSecondsMetric(metric)) {
    const absoluteSeconds = Math.abs(delta);
    if (absoluteSeconds < 60) {
      return signed(Math.round(delta), 's');
    }
    if (absoluteSeconds < 3_600) {
      return signed(Math.round(delta / 60), 'm');
    }
    return signed(roundToSingleDecimal(delta / 3_600), 'h');
  }

  if (metric.includes('count') || metric.includes('units')) {
    return signed(Math.round(delta));
  }

  return signed(roundToSingleDecimal(delta));
}

function formatInsightDelta(insight: AnalyticsInsight): string {
  return Number.isFinite(insight.delta_pct)
    ? formatSignedPercentage(insight.delta_pct)
    : formatInsightAbsoluteDelta(insight.metric, insight.delta);
}

function insightPolarity(
  polarity: string,
): ClockOutInsightViewModel['delta']['polarity'] {
  if (polarity === 'positive' || polarity === 'negative') return polarity;
  return 'neutral';
}

function humanizeMetric(metric: string): string {
  const words = metric
    .replace(/_seconds$/, ' time')
    .replaceAll('_', ' ')
    .trim();
  return words ? `${words[0]?.toUpperCase() ?? ''}${words.slice(1)}` : 'Metric';
}

function formatCount(value: number): string {
  return String(Math.round(value));
}

function formatRate(value: number): string {
  return roundToSingleDecimal(value).toFixed(1);
}

function formatRatioPercentage(value: number): string {
  return formatRate(value * 100);
}

function formatMinutes(value: number): string {
  const minutes = roundToSingleDecimal(value / 60);
  return Number.isInteger(minutes)
    ? `${minutes}m`
    : `${minutes.toFixed(1)}m`;
}

const KIOSK_INSIGHT_COPY: Record<
  string,
  (insight: AnalyticsInsight) => string
> = {
  completion_surge: (insight) =>
    `${formatCount(insight.target_value)} steps completed vs your recent average of ${formatCount(insight.baseline_value)}`,
  completion_dip: (insight) =>
    `${formatCount(insight.target_value)} steps completed vs your recent average of ${formatCount(insight.baseline_value)}`,
  on_a_roll: (insight) =>
    `${formatCount(insight.target_value)} days in a row at or above your recent completion bar`,
  deep_focus: (insight) =>
    `${formatRatioPercentage(insight.target_value)}% of the day spent working vs ${formatRatioPercentage(insight.baseline_value)}% usual`,
  faster_pace: (insight) =>
    `${formatRate(insight.target_value)} steps per focused hour vs ${formatRate(insight.baseline_value)} usual`,
  slower_pace: (insight) =>
    `${formatRate(insight.target_value)} steps per focused hour vs ${formatRate(insight.baseline_value)} usual`,
  rising_pauses: (insight) =>
    `Average pause ${formatMinutes(insight.target_value)} vs ${formatMinutes(insight.baseline_value)} usual`,
  leaving_steps_mid_shift: (insight) =>
    `${formatCount(insight.target_value)} steps left unfinished at shift end vs ${formatCount(insight.baseline_value)} usual`,
  choppy_work: (insight) =>
    `${formatRate(insight.target_value)} work sessions per finished step vs ${formatRate(insight.baseline_value)} usual`,
  quality_watch: (insight) =>
    `${formatRatioPercentage(insight.target_value)}% of raised issues resolved vs ${formatRatioPercentage(insight.baseline_value)}% usual`,
};

function toInsightViewModel(
  insight: AnalyticsInsight,
): ClockOutInsightViewModel {
  const kioskCopy = KNOWN_INSIGHT_CODES.has(insight.code)
    ? KIOSK_INSIGHT_COPY[insight.code]
    : undefined;
  const absoluteDelta = formatInsightAbsoluteDelta(
    insight.metric,
    insight.delta,
  );

  return {
    key: insight.code,
    text: kioskCopy
      ? kioskCopy(insight)
      : `${humanizeMetric(insight.metric)} changed by ${absoluteDelta} from the recent baseline`,
    delta: {
      value: formatInsightDelta(insight),
      polarity: insightPolarity(insight.polarity),
    },
  };
}

function formatWorkedSpan(milliseconds: number): string {
  // The displayed IN/OUT values are minute-precision, so the span is floored
  // to the same precision rather than overstating a partial final minute.
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatClientDate(now: Date, timeZone: string): string | null {
  if (!Number.isFinite(now.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone,
    }).format(now);
  } catch {
    return null;
  }
}

/**
 * Pure clock-out analytics → display view-model mapping.
 *
 * A rich summary requires one usable wall-clock span. The final valid
 * `ended_shift.start` marker is OUT and the last valid
 * `started_shift.start` marker at/before it is IN. Bucket totals are never
 * summed. `segments_truncated` is intentionally ignored: received markers
 * remain usable even when the drawable timeline was capped.
 *
 * Insights are mapped exactly as delivered by the asynchronous stats source;
 * this layer does not "correct" them from timeline data because the handoff
 * defines them as indicative rather than payroll-authoritative.
 */
export function toClockOutSummaryViewModel(
  analytics: ClockOutAnalytics | null,
  { timeZone, now = new Date() }: AnalyticsViewModelOptions,
): ClockOutSummaryViewModel | null {
  if (!analytics || !Array.isArray(analytics.segments)) return null;

  const ended = analytics.segments
    .filter(
      (segment) =>
        segment.state === 'ended_shift' &&
        Number.isFinite(Date.parse(segment.start)),
    )
    .sort(
      (left, right) =>
        Date.parse(right.start) - Date.parse(left.start),
    )[0];
  if (!ended) return null;

  const endedAt = Date.parse(ended.start);
  const started = analytics.segments
    .filter(
      (segment) =>
        segment.state === 'started_shift' &&
        Number.isFinite(Date.parse(segment.start)) &&
        Date.parse(segment.start) <= endedAt,
    )
    .sort(
      (left, right) =>
        Date.parse(right.start) - Date.parse(left.start),
    )[0];
  if (!started) return null;

  const startedAt = Date.parse(started.start);
  const dateLabel = formatClientDate(now, timeZone);

  const insights = Array.isArray(analytics.insights)
    ? analytics.insights.map(toInsightViewModel)
    : [];

  return {
    dateLabel,
    worked: {
      worked: formatWorkedSpan(endedAt - startedAt),
      in: formatTimeInTimeZone(started.start, timeZone),
      out: formatTimeInTimeZone(ended.start, timeZone),
    },
    insights,
  };
}
