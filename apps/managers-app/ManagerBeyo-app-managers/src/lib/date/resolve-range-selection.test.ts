import { describe, expect, it } from 'vitest';

import { resolveRangeSelection } from './resolve-range-selection';

describe('resolveRangeSelection', () => {
  it('updates the from date when editing within the existing range', () => {
    const result = resolveRangeSelection({
      activeTarget: 'from',
      clickedDate: new Date('2026-11-08'),
      fromDate: new Date('2026-11-06'),
      toDate: new Date('2026-11-10'),
    });

    expect(result.fromDate?.toISOString().slice(0, 10)).toBe('2026-11-08');
    expect(result.toDate?.toISOString().slice(0, 10)).toBe('2026-11-10');
    expect(result.nextActiveTarget).toBe('to');
    expect(result.shouldClose).toBe(false);
  });

  it('shifts the entire window forward when the new from date passes the current to date', () => {
    const result = resolveRangeSelection({
      activeTarget: 'from',
      clickedDate: new Date('2026-11-12'),
      fromDate: new Date('2026-11-06'),
      toDate: new Date('2026-11-10'),
    });

    expect(result.fromDate?.toISOString().slice(0, 10)).toBe('2026-11-12');
    expect(result.toDate?.toISOString().slice(0, 10)).toBe('2026-11-16');
    expect(result.nextActiveTarget).toBe('to');
    expect(result.shouldClose).toBe(false);
  });
});
