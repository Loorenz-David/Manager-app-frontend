export function formatNumberDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  return `${value}`;
}
