import { useCallback, useRef, useState } from "react";

type ScrollStateOptions = {
  threshold: number;
  hideThreshold?: number;
  showThreshold?: number;
  hysteresis: number;
  mode: "absolute" | "relative";
};

type ScrollStateResult = {
  isHidden: boolean;
  suspend: (durationMs?: number) => void;
  onScroll: (value: number) => void;
  resetState: (value: number) => void;
  initialize: (value: number) => void;
};

export function useScrollState({
  threshold,
  hideThreshold,
  showThreshold,
  hysteresis,
  mode,
}: ScrollStateOptions): ScrollStateResult {
  const [isHidden, setIsHidden] = useState(false);
  const hiddenTargetRef = useRef(false);
  const suppressedUntilRef = useRef(0);

  // Relative mode: track the position where the user last changed direction.
  const lastScrollValueRef = useRef(0);
  const directionAnchorRef = useRef(0);
  const movingForwardRef = useRef(false); // "forward" = increasing value (down or up depending on inverted)

  const applyHidden = useCallback((hidden: boolean) => {
    if (hiddenTargetRef.current === hidden) {
      return;
    }
    hiddenTargetRef.current = hidden;
    setIsHidden(hidden);
  }, []);

  const suspend = useCallback((durationMs = 120) => {
    suppressedUntilRef.current = performance.now() + durationMs;
  }, []);

  const onScroll = useCallback(
    (value: number) => {
      if (performance.now() < suppressedUntilRef.current) {
        return;
      }

      if (mode === "absolute") {
        if (!hiddenTargetRef.current && value > threshold) {
          applyHidden(true);
        } else if (hiddenTargetRef.current && value < hysteresis) {
          applyHidden(false);
        }
        return;
      }

      // Relative mode: delta from the last direction-change anchor.
      const delta = value - lastScrollValueRef.current;
      lastScrollValueRef.current = value;

      if (delta === 0) return;

      const movingForward = delta > 0;
      if (movingForward !== movingForwardRef.current) {
        // Direction reversed — reset the anchor to the current position.
        movingForwardRef.current = movingForward;
        directionAnchorRef.current = value;
      }

      const distanceFromAnchor = value - directionAnchorRef.current;
      const effectiveHideThreshold = hideThreshold ?? threshold;
      const effectiveShowThreshold = showThreshold ?? threshold;

      // distanceFromAnchor > 0  → moved forward (down / up-from-bottom) since anchor
      // distanceFromAnchor < 0  → moved backward (up / down-from-bottom) since anchor
      if (
        !hiddenTargetRef.current &&
        distanceFromAnchor > effectiveHideThreshold
      ) {
        applyHidden(true);
      } else if (
        hiddenTargetRef.current &&
        distanceFromAnchor < -effectiveShowThreshold
      ) {
        applyHidden(false);
      }
    },
    [applyHidden, threshold, hideThreshold, showThreshold, hysteresis, mode],
  );

  const resetState = useCallback(
    (value: number) => {
      if (mode === "absolute") {
        if (value < hysteresis) {
          applyHidden(false);
        }
      } else {
        // Relative: snap back to visible and re-anchor at the current position.
        lastScrollValueRef.current = value;
        directionAnchorRef.current = value;
        movingForwardRef.current = false;
        applyHidden(false);
      }
    },
    [applyHidden, hysteresis, mode],
  );

  const initialize = useCallback(
    (value: number) => {
      hiddenTargetRef.current = false;
      suppressedUntilRef.current = performance.now() + 120;

      if (mode === "absolute") {
        const shouldHide = value > threshold;
        setIsHidden(shouldHide);
        hiddenTargetRef.current = shouldHide;
      } else {
        // Relative: always start visible; anchor at the current position.
        setIsHidden(false);
        lastScrollValueRef.current = value;
        directionAnchorRef.current = value;
        movingForwardRef.current = false;
      }
    },
    [threshold, mode],
  );

  return { isHidden, suspend, onScroll, resetState, initialize };
}
