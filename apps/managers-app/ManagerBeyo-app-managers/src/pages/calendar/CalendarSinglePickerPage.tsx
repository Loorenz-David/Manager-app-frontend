import { useContext, useEffect, useState } from 'react';

import {
  DayCalendar,
  parseISOToDate,
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
};

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

  return (
    <div data-testid="calendar-single-picker-page">
      <DayCalendar
        disabled={[
          ...(rawProps.minDate ? [{ before: rawProps.minDate }] : []),
          ...(rawProps.maxDate ? [{ after: rawProps.maxDate }] : []),
        ]}
        mode="single"
        onSelect={handleSelect}
        selected={selectedDate}
      />
    </div>
  );
}
