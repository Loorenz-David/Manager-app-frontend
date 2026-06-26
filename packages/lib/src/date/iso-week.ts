export function isoWeek(dateString: string | null): number | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dayOfWeek = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayOfWeek + 3);
  const jan4 = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const dayOfYear = (date.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayOfYear - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}
