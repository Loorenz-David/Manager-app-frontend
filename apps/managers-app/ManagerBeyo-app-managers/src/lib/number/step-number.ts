import { clampNumber } from './clamp-number';

type StepDirection = 1 | -1;

type StepNumberArgs = {
  value: number | null;
  direction: StepDirection;
  step?: number;
  min?: number | null;
  max?: number | null;
};

function decimalPlaces(value: number): number {
  const valueString = String(value);

  if (valueString.includes('e-')) {
    const [, exponent] = valueString.split('e-');
    return Number(exponent);
  }

  const [, fraction = ''] = valueString.split('.');
  return fraction.length;
}

function precisionFactor(values: number[]): number {
  const maxPlaces = values.reduce((currentMax, value) => {
    if (!Number.isFinite(value)) {
      return currentMax;
    }

    return Math.max(currentMax, decimalPlaces(value));
  }, 0);

  return 10 ** maxPlaces;
}

export function stepNumber({
  value,
  direction,
  step = 1,
  min,
  max,
}: StepNumberArgs): number {
  const normalizedStep = Math.abs(step) || 1;

  if (value === null) {
    if (direction === 1) {
      const base = min !== undefined && min !== null && min > 0 ? min : normalizedStep;
      return clampNumber(base, min, max);
    }

    const base = min ?? 0;
    return clampNumber(base, min, max);
  }

  const factor = precisionFactor([
    value,
    normalizedStep,
    min ?? 0,
    max ?? 0,
  ]);
  const nextValue =
    (Math.round(value * factor) + direction * Math.round(normalizedStep * factor)) / factor;

  return clampNumber(nextValue, min, max);
}
