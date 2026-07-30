import type { KioskResult } from '../store/kiosk-flow.store';

/**
 * Clock-in results are read at a glance ("I'm in, at 06:58") so they return to
 * the keypad sooner than clock-out results, which carry the day summary a
 * worker actually reads. Expressed as a factor of the device's configured
 * auto-return window — **CHANGE THE CLOCK-IN PACE HERE.**
 */
export const CLOCK_IN_AUTO_RETURN_FACTOR = 0.5;

/** Never drop below this, whatever the factor and device config produce. */
export const MIN_AUTO_RETURN_SECONDS = 2;

/**
 * The auto-return window for a result screen. Clock-out uses the device's
 * configured value as-is; clock-in is faster by the factor above. Drives both
 * the store countdown/timer AND the ring animation (they read the same value).
 */
export function autoReturnSecondsForResult(
  kind: KioskResult['kind'],
  configuredSeconds: number,
): number {
  if (kind !== 'clock_in') return configuredSeconds;
  return Math.max(
    MIN_AUTO_RETURN_SECONDS,
    Math.round(configuredSeconds * CLOCK_IN_AUTO_RETURN_FACTOR),
  );
}
