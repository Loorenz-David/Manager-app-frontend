import Decimal from "decimal.js";

const metersFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function toDecimal(value: string | number | null): Decimal | null {
  if (value === null || value === "") {
    return null;
  }

  try {
    return new Decimal(value);
  } catch {
    return null;
  }
}

export function formatMeters(value: string | null): string | null {
  const decimal = toDecimal(value);
  if (!decimal) {
    return null;
  }

  return `${metersFormatter.format(Number(decimal.toDecimalPlaces(3).toFixed(3)))} m`;
}

export function isPositive(value: string | null): boolean {
  const decimal = toDecimal(value);
  return decimal ? decimal.gt(0) : false;
}

export function normalizeNonNegativeDecimalString(value: string): string | null {
  const trimmed = value.trim().replace(",", ".");
  const decimal = toDecimal(trimmed);

  if (!decimal || decimal.isNegative()) {
    return null;
  }

  return decimal.toDecimalPlaces(3).toFixed(3);
}

export function subtractMeters(
  a: string | null,
  b: string | null,
): { display: string; isPositive: boolean; isNegative: boolean } {
  const decA = toDecimal(a) ?? new Decimal(0);
  const decB = toDecimal(b) ?? new Decimal(0);
  const result = decA.minus(decB);
  const display = `${metersFormatter.format(
    Number(result.toDecimalPlaces(3).toFixed(3)),
  )} m`;

  return {
    display,
    isPositive: result.greaterThan(0),
    isNegative: result.isNegative(),
  };
}
