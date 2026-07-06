export function formatCompactCount(count: number): string {
  if (count < 1000) return String(count);
  return `${Math.round(count / 100) / 10}k`;
}
