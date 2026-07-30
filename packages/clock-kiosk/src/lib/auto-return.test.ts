import { describe, expect, it } from 'vitest';

import {
  CLOCK_IN_AUTO_RETURN_FACTOR,
  MIN_AUTO_RETURN_SECONDS,
  autoReturnSecondsForResult,
} from './auto-return';

describe('autoReturnSecondsForResult', () => {
  it('leaves clock-out on the device-configured window', () => {
    expect(autoReturnSecondsForResult('clock_out', 12)).toBe(12);
    expect(autoReturnSecondsForResult('clock_out', 120)).toBe(120);
  });

  it('returns clock-in faster by the configured factor', () => {
    expect(CLOCK_IN_AUTO_RETURN_FACTOR).toBe(0.5);
    expect(autoReturnSecondsForResult('clock_in', 12)).toBe(6);
    expect(autoReturnSecondsForResult('clock_in', 4)).toBe(2);
    expect(autoReturnSecondsForResult('clock_in', 30)).toBe(15);
  });

  it('rounds odd windows instead of truncating', () => {
    expect(autoReturnSecondsForResult('clock_in', 9)).toBe(5);
  });

  it('never drops below the floor, whatever the device config', () => {
    expect(autoReturnSecondsForResult('clock_in', 1)).toBe(
      MIN_AUTO_RETURN_SECONDS,
    );
    expect(autoReturnSecondsForResult('clock_in', 0)).toBe(
      MIN_AUTO_RETURN_SECONDS,
    );
  });
});
