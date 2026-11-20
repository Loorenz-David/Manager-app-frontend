/** House SKU date suffix: local day, month and two-digit year, e.g. 20 Nov 2026 → "201126". */
export function formatSkuDateCode(date: Date = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${pad(date.getFullYear() % 100)}`;
}
