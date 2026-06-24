import { useContext, useEffect, useState } from 'react';

import {
  type CalendarQuickSelectOption,
  DayCalendar,
  parseISOToDate,
  resolveRelativeDateOption,
  serializeDateToISO,
} from '@/components/primitives/date';
import {
  SurfaceHeaderContext,
  SurfacePropsContext,
} from '@/providers/SurfaceProvider';

type CalendarSinglePickerSurfaceProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
  quickSelectOptions?: CalendarQuickSelectOption[];
};

function isDateWithinBounds(
  date: Date,
  minDate: Date | undefined,
  maxDate: Date | undefined,
): boolean {
  if (minDate && date < minDate) {
    return false;
  }

  if (maxDate && date > maxDate) {
    return false;
  }

  return true;
}

export function CalendarSinglePickerPage() {
  const rawProps = useContext(
    SurfacePropsContext,
  ) as CalendarSinglePickerSurfaceProps;
  const header = useContext(SurfaceHeaderContext);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parseISOToDate(rawProps.currentValue),
  );

  useEffect(() => {
    setSelectedDate(parseISOToDate(rawProps.currentValue));
  }, [rawProps.currentValue]);

  useEffect(() => {
    if (rawProps.title && header) {
      header.setTitle(rawProps.title);
    }
  }, [rawProps.title, header]);

  function handleSelect(date: Date | undefined) {
    setSelectedDate(date);
    rawProps.onSelect(date ? serializeDateToISO(date) : null);

    if (date) {
      header?.requestClose();
    }
  }

  const quickSelectPills = (rawProps.quickSelectOptions ?? []).map((option) => {
    const date = resolveRelativeDateOption(option);
    const iso = serializeDateToISO(date);
    const selectedISO = selectedDate ? serializeDateToISO(selectedDate) : null;

    return {
      ...option,
      date,
      iso,
      selected: selectedISO === iso,
      disabled: !isDateWithinBounds(date, rawProps.minDate, rawProps.maxDate),
    };
  });

  return (
    <div className="flex flex-col" data-testid="calendar-single-picker-page">
      <DayCalendar
        disabled={[
          ...(rawProps.minDate ? [{ before: rawProps.minDate }] : []),
          ...(rawProps.maxDate ? [{ after: rawProps.maxDate }] : []),
        ]}
        mode="single"
        onSelect={handleSelect}
        selected={selectedDate}
      />
      {quickSelectPills.length ? (
        <>
        <div
          className="flex flex-wrap items-center gap-2 border-t border-border px-4 pb-4 pt-3"
          data-testid="calendar-single-picker-quick-select"
        >
          {quickSelectPills.map((option) => (
            <button
              key={option.id}
              className={[
                'inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150',
                option.selected
                  ? 'border-primary bg-primary text-[var(--color-card)]'
                  : 'border-border bg-card text-foreground hover:bg-muted',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
              data-testid={`calendar-single-picker-quick-select-${option.id}`}
              disabled={option.disabled}
              onClick={() => handleSelect(option.date)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
        </>
      ) : null}
    </div>
  );
}
