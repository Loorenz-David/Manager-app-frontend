import type { CompositionElement } from "./schemas";

/**
 * How far the video's own playhead may drift from the slide clock before we correct it.
 * Seeking every frame fights the video's decoder and stutters; never correcting lets a
 * long clip walk away from the timeline.
 */
export const VIDEO_SEEK_TOLERANCE_MS = 200;

/**
 * Where a clip's own playhead belongs for a given slide time.
 *
 * **This is the seam for trimming.** Every consumer — editor canvas, studio preview, phone
 * player — reads video position through this one function, so adding an in-point means
 * adding it here and nowhere else. When the backend grows a `media_start_ms` on the
 * composition element, it becomes the `inPointMs` below; the out-point belongs in
 * `compositionMediaEndMs`.
 */
export function compositionMediaTimeMs(
  element: CompositionElement,
  slideTimeMs: number,
): number {
  const inPointMs = 0;
  return Math.max(0, inPointMs + (slideTimeMs - element.start_ms));
}

/**
 * When the clip should stop, in its own time base — today its natural end, so `null`
 * means "play to the end of the file". A future `media_end_ms` out-point returns here.
 */
export function compositionMediaEndMs(element: CompositionElement): number | null {
  void element;
  return null;
}

/** True when the clip has played past its out-point (never, until trimming exists). */
export function isBeyondCompositionMediaEnd(
  element: CompositionElement,
  mediaTimeMs: number,
): boolean {
  const endMs = compositionMediaEndMs(element);
  return endMs !== null && mediaTimeMs >= endMs;
}
