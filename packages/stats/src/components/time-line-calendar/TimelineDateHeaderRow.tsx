import { parseLocalDateKey } from "../../lib/time-line-calendar/local-date";

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export type TimelineDateHeaderRowProps = {
  dates: string[];
  todayKey: string;
  focusDate: string;
};

// Per-column date header for three-day mode: abbreviated weekday over the
// day number. Today gets the circular bg-primary pill; a focused non-today
// date gets a muted pill. Aligned to the columns via the same gutter spacer.
export function TimelineDateHeaderRow({
  dates,
  todayKey,
  focusDate,
}: TimelineDateHeaderRowProps): React.JSX.Element {
  return (
    <div
      className="flex border-b border-border bg-background"
      data-testid="timeline-date-header-row"
    >
      <div aria-hidden="true" className="w-12 shrink-0" />
      {dates.map((dateKey) => {
        const date = parseLocalDateKey(dateKey);
        const isToday = dateKey === todayKey;
        const isFocused = dateKey === focusDate;

        return (
          <div
            key={dateKey}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2"
            data-testid={`timeline-date-header-${dateKey}`}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {WEEKDAY_FORMAT.format(date)}
            </span>
            <span
              className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                isToday
                  ? "bg-primary text-primary-foreground"
                  : isFocused
                    ? "bg-muted text-foreground"
                    : "text-foreground"
              }`}
            >
              {date.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
