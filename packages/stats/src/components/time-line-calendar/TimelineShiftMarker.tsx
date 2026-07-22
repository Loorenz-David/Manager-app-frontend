import { minuteToOffsetPx } from "../../lib/time-line-calendar/geometry";
import type { CalendarTimelineEvent } from "../../lib/time-line-calendar/segment-adapter";
import type { TimelineViewMode } from "../../lib/time-line-calendar/window";

export type TimelineShiftMarkerProps = {
  event: CalendarTimelineEvent;
  density: TimelineViewMode;
  pxPerMinute: number;
};

// Shift clock-in / clock-out ticks render as a zero-height boundary line at
// their timestamp — dot + rule + "Shift started/ended HH:mm" — never a filled
// duration block (mockup decision 20260719; backend markers added 20260720).
// Markers carry no records, so they are non-actionable.
// Clearance between a marker and the event edge it sits against.
const MARKER_GAP_PX = 6;

export function TimelineShiftMarker({
  event,
  density,
  pxPerMinute,
}: TimelineShiftMarkerProps): React.JSX.Element {
  const isStart = event.state === "started_shift";
  const color = isStart ? "#2fa15c" : "#e2572b";
  const testId = isStart
    ? `timeline-shift-start-${event.key}`
    : `timeline-shift-end-${event.key}`;
  const label = `${event.stateLabel} ${event.startLabel}`;
  const isCompact = density === "threeDay";

  // Sit fully clear of the adjacent event: a start tick rests just ABOVE its
  // timestamp (in the empty grid before the first event), an end tick just
  // BELOW it — so the line and label never overlap the block.
  const transform = isStart
    ? `translateY(calc(-100% - ${MARKER_GAP_PX}px))`
    : `translateY(${MARKER_GAP_PX}px)`;

  return (
    <div
      className={`absolute inset-x-0.5 z-500 flex gap-1 ${
        isCompact ? "items-start" : "items-center"
      }`}
      data-testid={testId}
      style={{
        top: minuteToOffsetPx(event.startMinute, pxPerMinute),
        transform,
      }}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${isCompact ? "mt-px" : ""}`}
        style={{ backgroundColor: color }}
      />
      {/* Wide columns get the full connecting rule; narrow three-day columns
          drop it so the label has room to wrap instead of spilling into the
          next day. */}
      {!isCompact ? (
        <span
          aria-hidden="true"
          className="h-0.5 min-w-0 flex-1"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span
        className={
          isCompact
            ? "min-w-0 flex-1 break-words text-right text-[10px] font-semibold leading-tight"
            : "shrink-0 text-xs font-semibold"
        }
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
