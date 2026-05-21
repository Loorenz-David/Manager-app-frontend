export function clampNumber(
  value: number,
  min?: number | null,
  max?: number | null,
): number {
  let nextValue = value;

  if (min !== undefined && min !== null) {
    nextValue = Math.max(min, nextValue);
  }

  if (max !== undefined && max !== null) {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}
