type SanitizeNumberInputOptions = {
  allowDecimal?: boolean;
  allowNegative?: boolean;
};

export function sanitizeNumberInput(
  raw: string,
  { allowDecimal = false, allowNegative = false }: SanitizeNumberInputOptions = {},
): string {
  let sanitized = '';
  let hasDecimal = false;
  let hasSign = false;

  for (const char of raw) {
    if (char >= '0' && char <= '9') {
      sanitized += char;
      continue;
    }

    if (allowDecimal && (char === '.' || char === ',')) {
      if (hasDecimal) {
        continue;
      }
      sanitized += '.';
      hasDecimal = true;
      continue;
    }

    if (allowNegative && char === '-') {
      if (hasSign || sanitized.length > 0) {
        continue;
      }
      sanitized += '-';
      hasSign = true;
    }
  }

  return sanitized;
}
