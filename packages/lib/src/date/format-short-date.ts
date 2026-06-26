function parseDate(value: string): Date | null {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const fallback = new Date(`${value}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatSingle(dateString: string | null | undefined): string | null {
  if (!dateString) {
    return null;
  }

  const date = parseDate(dateString);
  if (!date) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (date.getFullYear() === currentYear) {
    return `${month}-${day}`;
  }

  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatShortDate(
  start: string | null | undefined,
  end?: string | null,
): string | null {
  const startFormatted = formatSingle(start);
  if (!startFormatted) {
    return null;
  }

  if (!end) {
    return startFormatted;
  }

  const endFormatted = formatSingle(end);
  if (!endFormatted) {
    return startFormatted;
  }

  return `${startFormatted} → ${endFormatted}`;
}
