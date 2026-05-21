import { describe, expect, it } from 'vitest';

import { clampNumber } from './clamp-number';
import { formatNumberDisplay } from './format-number-display';
import { parseNumberDraft } from './parse-number-draft';
import { sanitizeNumberInput } from './sanitize-number-input';
import { stepNumber } from './step-number';

describe('number helpers', () => {
  it('sanitizes numeric drafts without native number input quirks', () => {
    expect(sanitizeNumberInput('1a2b3')).toBe('123');
    expect(sanitizeNumberInput('3,5', { allowDecimal: true })).toBe('3.5');
  });

  it('preserves partial decimal drafts while exposing parsed numeric state', () => {
    const parsed = parseNumberDraft('1.', { allowDecimal: true });

    expect(parsed.sanitizedDraft).toBe('1.');
    expect(parsed.parsedValue).toBe(1);
    expect(parsed.hasParsedValue).toBe(true);
    expect(parsed.isPartial).toBe(true);
  });

  it('clamps values to configured min and max', () => {
    expect(clampNumber(12, 0, 10)).toBe(10);
    expect(clampNumber(-1, 0, 10)).toBe(0);
  });

  it('steps decimals without floating-point drift', () => {
    expect(stepNumber({ value: 0.2, direction: 1, step: 0.1, min: 0, max: 1 })).toBe(0.3);
  });

  it('formats empty values as an empty display string', () => {
    expect(formatNumberDisplay(null)).toBe('');
    expect(formatNumberDisplay(12.5)).toBe('12.5');
  });
});
