export type RelativeDateUnit = 'day' | 'week' | 'month';

export type CalendarQuickSelectOption = {
  id: string;
  label: string;
  amount: number;
  unit: RelativeDateUnit;
};

export type CalendarDateRange = {
  from: Date;
  to: Date;
};

export type CalendarQuickRangeKind =
  | 'yesterday'
  | 'last-n-days'
  | 'this-week'
  | 'this-month';

export type CalendarQuickRangeOption = {
  id: string;
  label: string;
  kind: CalendarQuickRangeKind;
  // Number of trailing days (including today) for `last-n-days`; ignored otherwise.
  amount?: number;
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcCalendarDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

export function parseISOToDate(
  dateString: string | null | undefined,
): Date | undefined {
  if (!dateString) return undefined;

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(dateString);
  if (dateOnlyMatch) {
    return new Date(
      Date.UTC(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      ),
    );
  }

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? undefined : toUtcCalendarDate(date);
}

export function serializeDateToISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addMonthsClamped(baseDate: Date, months: number): Date {
  const targetMonthStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + months,
    1,
  );
  const targetMonthLastDay = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0,
  ).getDate();

  return new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth(),
    Math.min(baseDate.getDate(), targetMonthLastDay),
  );
}

export function resolveRelativeDateOption(
  option: CalendarQuickSelectOption,
  baseDate: Date = new Date(),
): Date {
  const localDayAnchor = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );

  if (option.unit === 'month') {
    const localDate = addMonthsClamped(localDayAnchor, option.amount);
    return new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
      ),
    );
  }

  const daysToAdd = option.unit === 'week' ? option.amount * 7 : option.amount;
  localDayAnchor.setDate(localDayAnchor.getDate() + daysToAdd);

  return new Date(
    Date.UTC(
      localDayAnchor.getFullYear(),
      localDayAnchor.getMonth(),
      localDayAnchor.getDate(),
    ),
  );
}

// Resolves a named quick-range preset to a { from, to } pair of UTC calendar
// dates. Anchored on the UTC calendar day (consistent with serializeDateToISO /
// parseISOToDate), so a range ending "today" serializes to the same ISO string
// the rest of the app derives from `new Date()`. Weeks start on Sunday to match
// the DayCalendar grid (react-day-picker default weekStartsOn = 0).
export function resolveQuickRangeOption(
  option: CalendarQuickRangeOption,
  baseDate: Date = new Date(),
): CalendarDateRange {
  const today = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
    ),
  );

  const shiftedByDays = (days: number): Date => {
    const next = new Date(today);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  };

  switch (option.kind) {
    case 'yesterday': {
      const yesterday = shiftedByDays(-1);
      return { from: yesterday, to: yesterday };
    }
    case 'last-n-days': {
      const days = Math.max(1, option.amount ?? 2);
      return { from: shiftedByDays(-(days - 1)), to: today };
    }
    case 'this-week': {
      // getUTCDay(): 0 = Sunday.
      return { from: shiftedByDays(-today.getUTCDay()), to: today };
    }
    case 'this-month': {
      return {
        from: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        ),
        to: today,
      };
    }
  }
}

export function formatDateDisplay(
  dateString: string | null | undefined,
): string | undefined {
  const date = parseISOToDate(dateString);
  if (!date) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
