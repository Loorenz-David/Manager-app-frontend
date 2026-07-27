import { useEffect } from "react";

import { beginUiTransition } from "./ui-transition-gate";

/**
 * Holds the UI transition gate while `isTransitioning` is true (a surface
 * animating closed, a row animating out). Releases on unmount, so work queued
 * with `runWhenUiSettled` can never be stranded by a component that goes away
 * mid-animation.
 */
export function useUiTransitionToken(isTransitioning: boolean): void {
  useEffect(() => {
    if (!isTransitioning) {
      return;
    }

    return beginUiTransition();
  }, [isTransitioning]);
}
