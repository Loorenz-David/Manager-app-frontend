import { useState } from "react";
import { CalendarX, Check } from "lucide-react";

import { DayCalendar, FieldErrorPill } from "@beyo/ui";

import {
  calendarToday,
  composeScheduleInstant,
  isFutureInstant,
  scheduleDayOf,
  scheduleTimeOf,
} from "../../lib/schedule-sheet";
import { SCHEDULE_IN_THE_PAST_MESSAGE } from "../../lib/version-form";

export type StockReportScheduleSheetContentProps = {
  current: string | null;
  now: number;
  /** A new instant (ISO) or `null` to remove the schedule. */
  onSelect: (iso: string | null) => void;
  /** Called after Confirm or Clear — the page closes the sheet. */
  onDone: () => void;
};

/**
 * The schedule sheet (plan §F.5, OC-1, OC-9): the calendar, a native time row
 * under it, and Clear / Confirm at the bottom (owner, 2026-09-28). Tapping a
 * day or changing the time only edits the pick; Confirm composes the calendar
 * day and the local time, emits and closes, and Clear removes the schedule and
 * closes. A pick in the past is refused inline and Confirm stays disabled —
 * the same rule the backend answers with `STOCK_REPORT_SCHEDULE_IN_THE_PAST`.
 */
export function StockReportScheduleSheetContent({
  current,
  now,
  onSelect,
  onDone,
}: StockReportScheduleSheetContentProps): React.JSX.Element {
  const [day, setDay] = useState<Date | undefined>(() => scheduleDayOf(current));
  // Opens on the schedule's month, else today's — never the device clock's
  // month when the sheet was handed another `now`.
  const [month, setMonth] = useState<Date>(() => day ?? calendarToday(now));
  const [time, setTime] = useState(() => scheduleTimeOf(current));

  const instant = day ? composeScheduleInstant(day, time) : null;
  const inThePast = instant !== null && !isFutureInstant(instant, now);
  const canConfirm = instant !== null && !inThePast;
  // Something to clear: a stored schedule, or a day picked in this opening.
  const canClear = current !== null || day !== undefined;

  return (
    <div className="flex flex-col gap-2" data-testid="stock-report-schedule-sheet">
      <DayCalendar
        disabled={{ before: calendarToday(now) }}
        mode="single"
        month={month}
        selected={day}
        onMonthChange={setMonth}
        onSelect={(picked: Date | undefined) => {
          if (picked) setDay(picked);
        }}
      />

      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="stock-report-schedule-time">
            Time
          </label>
          <FieldErrorPill
            data-testid="stock-report-schedule-error"
            message={inThePast ? SCHEDULE_IN_THE_PAST_MESSAGE : undefined}
          />
        </div>
        <input
          className="h-12 w-full rounded-lg border border-border bg-transparent px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="stock-report-schedule-time"
          id="stock-report-schedule-time"
          step={300}
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border px-4 pb-4 pt-3">
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground disabled:opacity-50"
          data-testid="stock-report-schedule-clear"
          disabled={!canClear}
          type="button"
          onClick={() => {
            onSelect(null);
            onDone();
          }}
        >
          <CalendarX aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          Clear
        </button>
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="stock-report-schedule-confirm"
          disabled={!canConfirm}
          type="button"
          onClick={() => {
            if (!canConfirm) return;
            onSelect(instant);
            onDone();
          }}
        >
          <Check aria-hidden="true" className="size-4 shrink-0" />
          Confirm
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px)" />
    </div>
  );
}
