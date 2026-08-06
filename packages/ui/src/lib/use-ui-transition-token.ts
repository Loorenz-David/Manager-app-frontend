import { useLayoutEffect } from "react";

import { beginUiTransition } from "./ui-transition-gate";

/**
 * Holds the UI transition gate while `isTransitioning` is true (a surface
 * animating closed, a row animating out, a pane sliding away). Releases on
 * unmount, so work queued with `runWhenUiSettled` can never be stranded by a
 * component that goes away mid-animation.
 *
 * Layout effect, deliberately: the queue flushes on a requestAnimationFrame,
 * and a caller that queues work in the same interaction that starts the
 * animation — tap a row, navigate, then ask for the follow-up — would otherwise
 * race it. Passive effects can run after that frame, which would let the work
 * fire before this token was ever taken, i.e. squarely inside the animation it
 * was supposed to wait for. Acquiring before paint closes that window; the
 * release is unchanged.
 */
export function useUiTransitionToken(isTransitioning: boolean): void {
  useLayoutEffect(() => {
    if (!isTransitioning) {
      return;
    }

    return beginUiTransition();
  }, [isTransitioning]);
}
