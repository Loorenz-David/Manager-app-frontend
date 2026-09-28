import { useState } from "react";
import { CalendarX } from "lucide-react";

import { cn } from "@beyo/lib";
import { DayCalendar, FieldErrorPill } from "@beyo/ui";

import {
  composeScheduleInstant,
  isFutureInstant,
  scheduleDayOf,
  scheduleTimeOf,
  startOfLocalDay,
} from "../../lib/schedule-sheet";
import { SCHEDULE_IN_THE_PAST_MESSAGE } from "../../lib/version-form";
import { ROW_CLASS } from "./StockReportDetailMenuSheetContent";

export type StockReportScheduleSheetContentProps = {
  current: string | null;
  now: number;
  /** A new instant (ISO) or `null` to remove the schedule. */
  onSelect: (iso: string | null) => void;
  /** Called after a day pick or the remove row — the page closes the sheet. */
  onDone: () => void;
};

/**
 * The schedule sheet (plan §F.5, OC-1, OC-9): a "Remove schedule" row while
 * there is one, the calendar, and a native time row under it. A day pick
 * composes the local day and time, emits and closes; a time change with a
 * day already chosen emits and stays. A past instant is refused inline — the
 * same rule the backend answers with `STOCK_REPORT_SCHEDULE_IN_THE_PAST`.
 */
export function StockReportScheduleSheetContent({
  current,
  now,
  onSelect,
  onDone,
}: StockReportScheduleSheetContentProps): React.JSX.Element {
  const [day, setDay] = useState<Date | undefined>(() => scheduleDayOf(current));
  const [time, setTime] = useState(() => scheduleTimeOf(current));
  const [refused, setRefused] = useState(false);

  /** Emits the instant when it is valid and in the future; says whether it did. */
  function emit(nextDay: Date, nextTime: string): boolean {
    const iso = composeScheduleInstant(nextDay, nextTime);
    if (iso === null) return false;
    if (!isFutureInstant(iso, now)) {
      setRefused(true);
      return false;
    }
    setRefused(false);
    onSelect(iso);
    return true;
  }

  return (
    <div className="flex flex-col gap-2 pb-4" data-testid="stock-report-schedule-sheet">
      {current !== null ? (
        <div className="px-4">
          <button
            className={cn(ROW_CLASS)}
            data-testid="stock-report-schedule-remove"
            type="button"
            onClick={() => {
              onSelect(null);
              onDone();
            }}
          >
            <CalendarX aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            Remove schedule
          </button>
        </div>
      ) : null}

      <DayCalendar
        disabled={{ before: startOfLocalDay(now) }}
        mode="single"
        selected={day}
        onSelect={(picked: Date | undefined) => {
          if (!picked) return;
          setDay(picked);
          if (emit(picked, time)) onDone();
        }}
      />

      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="stock-report-schedule-time">
            Time
          </label>
          <FieldErrorPill
            data-testid="stock-report-schedule-error"
            message={refused ? SCHEDULE_IN_THE_PAST_MESSAGE : undefined}
          />
        </div>
        <input
          className="h-12 w-full rounded-lg border border-border bg-transparent px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="stock-report-schedule-time"
          id="stock-report-schedule-time"
          step={300}
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            if (day) emit(day, event.target.value);
          }}
        />
      </div>
    </div>
  );
}
