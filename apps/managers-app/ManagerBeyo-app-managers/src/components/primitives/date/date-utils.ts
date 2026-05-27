export type RelativeDateUnit = 'day' | 'week' | 'month';

export type CalendarQuickSelectOption = {
  id: string;
  label: string;
  amount: number;
  unit: RelativeDateUnit;
};

export function parseISOToDate(
  dateString: string | null | undefined,
): Date | undefined {
  if (!dateString) return undefined;

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

export function formatDateDisplay(
  dateString: string | null | undefined,
): string | undefined {
  if (!dateString) return undefined;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
