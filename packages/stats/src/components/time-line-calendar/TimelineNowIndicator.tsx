import { minuteToOffsetPx } from "../../lib/time-line-calendar/geometry";
import {
  formatLocalTime,
  minuteOfLocalDay,
} from "../../lib/time-line-calendar/local-date";

export type TimelineNowIndicatorProps = {
  now: Date;
  pxPerMinute: number;
};

// Minute-accurate current-time line for today's column (single-day mode).
// Uses the same local-wall-clock scale as every event.
export function TimelineNowIndicator({
  now,
  pxPerMinute,
}: TimelineNowIndicatorProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-600 flex -translate-y-1/2 items-center"
      data-testid="timeline-now-indicator"
      style={{ top: minuteToOffsetPx(minuteOfLocalDay(now), pxPerMinute) }}
    >
      <span className="-ml-1 size-2 shrink-0 rounded-full bg-red-500" />
      <span className="h-px min-w-0 flex-1 bg-red-500" />
      <span className="mr-0.5 shrink-0 rounded bg-red-500 px-1 py-px text-[10px] font-semibold tabular-nums text-white">
        {formatLocalTime(now)}
      </span>
    </div>
  );
}
