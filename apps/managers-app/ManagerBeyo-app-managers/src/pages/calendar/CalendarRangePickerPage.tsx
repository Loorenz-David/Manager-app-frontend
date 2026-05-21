import { useContext, useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  DateRangeSelectionTabs,
  DayCalendar,
  formatDateDisplay,
  parseISOToDate,
  serializeDateToISO,
} from '@/components/primitives/date';
import {
  SurfaceHeaderContext,
  SurfacePropsContext,
} from '@/providers/SurfaceProvider';

type CalendarRangePickerSurfaceProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: 'from' | 'to';
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

export function CalendarRangePickerPage() {
  const rawProps = useContext(
    SurfacePropsContext,
  ) as CalendarRangePickerSurfaceProps;
  const header = useContext(SurfaceHeaderContext);
  const [activeTarget, setActiveTarget] = useState<'from' | 'to'>(
    rawProps.initialTarget ?? 'from',
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
    header?.setTitle('Select delivery window');
  }, [header]);

  useEffect(() => {
    setActiveTarget(rawProps.initialTarget ?? 'from');
  }, [rawProps.initialTarget]);

  function handleDaySelect(date: Date | undefined) {
    if (!date) return;

    if (activeTarget === 'from') {
      setFromDate(date);
      rawProps.onFromSelect(serializeDateToISO(date));
      setActiveTarget('to');
      return;
    }

    setToDate(date);
    rawProps.onToSelect(serializeDateToISO(date));
    header?.requestClose();
  }

  return (
    <div data-testid="calendar-range-picker-page">
      <DateRangeSelectionTabs
        activeTarget={activeTarget}
        fromLabel={
          fromDate ? formatDateDisplay(serializeDateToISO(fromDate)) : undefined
        }
        fromPlaceholder={rawProps.fromLabel ?? 'Select start'}
        onFromPress={() => setActiveTarget('from')}
        onToPress={() => setActiveTarget('to')}
        toLabel={toDate ? formatDateDisplay(serializeDateToISO(toDate)) : undefined}
        toPlaceholder={rawProps.toLabel ?? 'Select end'}
      />
      <DayCalendar
        mode="range"
        onSelect={(range: DateRange | undefined) => {
          if (!range) return;
          handleDaySelect(activeTarget === 'from' ? range.from : range.to);
        }}
        selected={{ from: fromDate, to: toDate }}
      />
    </div>
  );
}
