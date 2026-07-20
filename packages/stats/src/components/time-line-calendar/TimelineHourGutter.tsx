import { dayHeightPxOf } from "../../lib/time-line-calendar/geometry";

const HOURS = Array.from({ length: 23 }, (_, index) => index + 1);

type TimelineHourGutterProps = {
  pxPerHour: number;
};

// Left-side hour labels on the shared vertical scale. Decorative — the
// events themselves carry the accessible time information.
export function TimelineHourGutter({
  pxPerHour,
}: TimelineHourGutterProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="relative w-12 shrink-0"
      style={{ height: dayHeightPxOf(pxPerHour) }}
    >
      {HOURS.map((hour) => (
        <span
          key={hour}
          className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
          style={{ top: hour * pxPerHour }}
        >
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );
}
