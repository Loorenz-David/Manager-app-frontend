export function formatMetersValue(value: number | null | undefined): string {
  const safeValue = Number.isFinite(value ?? NaN) ? Number(value) : 0;
  return `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: safeValue % 1 === 0 ? 0 : 1,
  }).format(safeValue)} m`;
}

/** Formats a meters value with exactly 3 decimal places, e.g. "1.250 m". */
export function formatMeters3(
  value: number | string | null | undefined,
): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(safeValue)} m`;
}

export function formatLocalDate(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(date);
}

export function toTitleCaseLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
