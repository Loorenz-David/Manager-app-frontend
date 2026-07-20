import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { DayCalendar, parseISOToDate, serializeDateToISO } from "@beyo/ui";

import { localDateKey } from "../lib/time-line-calendar/local-date";
import type { TimelineViewMode } from "../lib/time-line-calendar/window";
import type { WorkerTimelineDateSheetProps } from "../surface-ids";

const MODE_OPTIONS: { mode: TimelineViewMode; label: string }[] = [
  { mode: "day", label: "1 day" },
  { mode: "threeDay", label: "3 days" },
];

// Package-owned date picker sheet. Mode toggling applies immediately (the
// accessible alternative to pinch zooming); tapping a date applies it as the
// newest visible date and dismisses the sheet. Future dates are disabled
// (Phase 1 clamp).
export function WorkerTimelineDateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<WorkerTimelineDateSheetProps>();
  const [mode, setMode] = useState<TimelineViewMode>(props.mode ?? "day");
  const selectedDate = props.selectedDate ?? localDateKey(new Date());
  const maxDate = props.maxDate ?? localDateKey(new Date());

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeChange(nextMode: TimelineViewMode): void {
    setMode(nextMode);
    // Apply immediately so mode switching works without picking a new date.
    props.onSelect?.(selectedDate, nextMode);
  }

  // DayCalendar runs react-day-picker with timeZone: "UTC", so its Dates are
  // UTC-anchored — serializeDateToISO round-trips the tapped day key exactly.
  function handleDaySelect(date: Date | undefined): void {
    if (!date) {
      return;
    }
    props.onSelect?.(serializeDateToISO(date), mode);
    header?.requestClose();
  }

  return (
    <div
      className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-4"
      data-testid="worker-timeline-date-sheet"
    >
      <div
        aria-label="Timeline view mode"
        className="flex rounded-full bg-muted p-1"
        role="group"
      >
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            aria-pressed={mode === option.mode}
            className={`min-w-0 flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
              mode === option.mode
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            data-testid={`timeline-mode-${option.mode}`}
            type="button"
            onClick={() => handleModeChange(option.mode)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DayCalendar
        disabled={
          parseISOToDate(maxDate) ? { after: parseISOToDate(maxDate)! } : undefined
        }
        mode="single"
        selected={parseISOToDate(selectedDate)}
        onSelect={handleDaySelect}
      />
    </div>
  );
}
