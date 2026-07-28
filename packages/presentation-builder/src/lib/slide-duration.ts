/**
 * Slide duration rules. The backend only requires `duration_ms > 0`
 * (`validate_slide_timeline`) — there is no upper bound there, so there is none here
 * either. The slider handle covers the common 2–12 s range; anything longer is typed
 * into the value field.
 */

export const SLIDE_DURATION_MIN_MS = 2_000;
export const SLIDE_DURATION_STEP_MS = 500;
/** Range of the drag handle only — NOT a cap on the value. */
export const SLIDE_DURATION_SLIDER_MAX_SECONDS = 12;

/** Snaps to the authoring step and enforces the floor. Unbounded above. */
export function roundSlideDurationMs(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return SLIDE_DURATION_MIN_MS;
  const stepped = Math.round(durationMs / SLIDE_DURATION_STEP_MS) * SLIDE_DURATION_STEP_MS;
  return Math.max(SLIDE_DURATION_MIN_MS, stepped);
}

/** `4.0s` under a minute, `1:30` (or `1:30.5`) at or above one. */
export function formatSlideDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0.0s";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  const whole = Math.floor(remainder);
  const fraction = remainder - whole;
  const fractionLabel = fraction > 0 ? `.${Math.round(fraction * 10)}` : "";
  return `${minutes}:${String(whole).padStart(2, "0")}${fractionLabel}`;
}

/**
 * Accepts what an author would actually type: `8`, `8s`, `90`, `1:30`, `2m`, `2 min`.
 * Returns seconds, or `null` when the text isn't a duration (caller keeps the old value).
 */
export function parseSlideDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (text === "") return null;

  const clock = /^(\d+):([0-5]?\d(?:\.\d+)?)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const scalar = /^(\d+(?:\.\d+)?)\s*(ms|s(?:ec(?:onds?)?)?|m(?:in(?:utes?)?)?)?$/.exec(text);
  if (!scalar) return null;
  const value = Number(scalar[1]);
  if (!Number.isFinite(value)) return null;
  const unit = scalar[2];
  if (unit === "ms") return value / 1_000;
  if (unit !== undefined && unit.startsWith("m")) return value * 60;
  return value;
}
