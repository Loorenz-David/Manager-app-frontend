import { dayHeightPxOf } from "../../lib/time-line-calendar/geometry";

const HOUR_LINES = Array.from({ length: 24 }, (_, index) => index);

type TimelineDayColumnProps = {
  pxPerHour: number;
  children: React.ReactNode;
  testId?: string;
};

// One local calendar day: 24 hour rules + absolutely positioned events.
export function TimelineDayColumn({
  pxPerHour,
  children,
  testId,
}: TimelineDayColumnProps): React.JSX.Element {
  return (
    <div
      className="relative min-w-0 flex-1 border-l border-border/50"
      data-testid={testId}
      style={{ height: dayHeightPxOf(pxPerHour) }}
    >
      {HOUR_LINES.map((hour) => (
        <div
          key={hour}
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-border/40"
          style={{ top: hour * pxPerHour }}
        />
      ))}
      {children}
    </div>
  );
}
