type ActiveTarget = 'from' | 'to';

export type RangeSelectionResolution = {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  nextActiveTarget: ActiveTarget;
  shouldClose: boolean;
};

function toUtcDayTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function diffDaysUtc(start: Date, end: Date): number {
  return Math.round((toUtcDayTimestamp(end) - toUtcDayTimestamp(start)) / 86400000);
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function resolveRangeSelection({
  activeTarget,
  clickedDate,
  fromDate,
  toDate,
}: {
  activeTarget: ActiveTarget;
  clickedDate: Date;
  fromDate: Date | undefined;
  toDate: Date | undefined;
}): RangeSelectionResolution {
  const hasCompleteRange = Boolean(fromDate && toDate);
  const rangeSpanDays =
    fromDate && toDate ? diffDaysUtc(fromDate, toDate) : null;

  if (activeTarget === 'from') {
    if (
      hasCompleteRange &&
      toDate &&
      rangeSpanDays !== null &&
      toUtcDayTimestamp(clickedDate) > toUtcDayTimestamp(toDate)
    ) {
      return {
        fromDate: clickedDate,
        toDate: addDaysUtc(clickedDate, rangeSpanDays),
        nextActiveTarget: 'to',
        shouldClose: false,
      };
    }

    return {
      fromDate: clickedDate,
      toDate,
      nextActiveTarget: 'to',
      shouldClose: false,
    };
  }

  if (!fromDate) {
    return {
      fromDate: clickedDate,
      toDate: undefined,
      nextActiveTarget: 'to',
      shouldClose: false,
    };
  }

  if (toUtcDayTimestamp(clickedDate) < toUtcDayTimestamp(fromDate)) {
    if (hasCompleteRange && rangeSpanDays !== null) {
      return {
        fromDate: addDaysUtc(clickedDate, -rangeSpanDays),
        toDate: clickedDate,
        nextActiveTarget: 'to',
        shouldClose: true,
      };
    }

    return {
      fromDate: clickedDate,
      toDate: undefined,
      nextActiveTarget: 'to',
      shouldClose: false,
    };
  }

  return {
    fromDate,
    toDate: clickedDate,
    nextActiveTarget: 'to',
    shouldClose: true,
  };
}
