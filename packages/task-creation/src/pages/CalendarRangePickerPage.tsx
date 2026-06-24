import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { resolveRangeSelection } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  BoxSlidePicker,
  DayCalendar,
  formatDateDisplay,
  parseISOToDate,
  serializeDateToISO,
} from "@beyo/ui";

type CalendarRangePickerSurfaceProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

export function CalendarRangePickerPage(): React.JSX.Element {
  const rawProps = useSurfaceProps<CalendarRangePickerSurfaceProps>();
  const header = useSurfaceHeader();
  const [activeTarget, setActiveTarget] = useState<"from" | "to">(
    rawProps.initialTarget ?? "from",
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(
    parseISOToDate(rawProps.currentFrom),
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    parseISOToDate(rawProps.currentTo),
  );

  useEffect(() => {
    setFromDate(parseISOToDate(rawProps.currentFrom));
  }, [rawProps.currentFrom]);

  useEffect(() => {
    setToDate(parseISOToDate(rawProps.currentTo));
  }, [rawProps.currentTo]);

  useEffect(() => {
    header?.setTitle("Select delivery window");
  }, [header]);

  useEffect(() => {
    setActiveTarget(rawProps.initialTarget ?? "from");
  }, [rawProps.initialTarget]);

  function handleDaySelect(date: Date) {
    const resolution = resolveRangeSelection({
      activeTarget,
      clickedDate: date,
      fromDate,
      toDate,
    });

    setFromDate(resolution.fromDate);
    setToDate(resolution.toDate);
    rawProps.onFromSelect?.(
      resolution.fromDate ? serializeDateToISO(resolution.fromDate) : null,
    );
    rawProps.onToSelect?.(
      resolution.toDate ? serializeDateToISO(resolution.toDate) : null,
    );
    setActiveTarget(resolution.nextActiveTarget);

    if (resolution.shouldClose) {
      header?.requestClose();
    }
  }

  return (
    <div data-testid="calendar-range-picker-page">
      <BoxSlidePicker
        className="mx-4 mb-4 mt-2"
        dataTestId="date-range-selection-tabs"
        options={[
          {
            value: "from",
            testId: "date-range-from-tab",
            label: (
              <span className="flex min-w-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                  From
                </span>
                <span
                  className={
                    fromDate
                      ? "mt-0.5 text-sm font-medium text-foreground"
                      : "mt-0.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  {fromDate
                    ? formatDateDisplay(serializeDateToISO(fromDate))
                    : (rawProps.fromLabel ?? "Select start")}
                </span>
              </span>
            ),
          },
          {
            value: "to",
            testId: "date-range-to-tab",
            label: (
              <span className="flex min-w-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                  To
                </span>
                <span
                  className={
                    toDate
                      ? "mt-0.5 text-sm font-medium text-foreground"
                      : "mt-0.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  {toDate
                    ? formatDateDisplay(serializeDateToISO(toDate))
                    : (rawProps.toLabel ?? "Select end")}
                </span>
              </span>
            ),
          },
        ]}
        value={activeTarget}
        onValueChange={setActiveTarget}
      />
      <DayCalendar
        mode="range"
        onDayClick={handleDaySelect}
        onSelect={(_range: DateRange | undefined) => {}}
        selected={{ from: fromDate, to: toDate }}
      />
    </div>
  );
}
