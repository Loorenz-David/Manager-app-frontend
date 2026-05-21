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
