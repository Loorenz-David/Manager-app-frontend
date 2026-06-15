import { useCallback, useRef, useState } from "react";

declare global {
  interface Window {
    __BEYO_SCROLL_DEBUG__?: boolean;
  }
}

type ScrollStateOptions = {
  threshold: number;
  topOffset: number;
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

function shouldDebugScroll(): boolean {
  return typeof window !== "undefined" && Boolean(window.__BEYO_SCROLL_DEBUG__);
}

export function useScrollState({
  threshold,
  topOffset,
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

    if (shouldDebugScroll()) {
      console.log("[scroll-debug][state] applyHidden", {
        hidden,
      });
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

      const delta = value - lastScrollValueRef.current;
      lastScrollValueRef.current = value;

      if (shouldDebugScroll()) {
        console.log("[scroll-debug][state] onScroll", {
          mode,
          value,
          delta,
          hidden: hiddenTargetRef.current,
          threshold,
          hysteresis,
          topOffset,
          hideThreshold,
          showThreshold,
        });
      }

      if (mode === "absolute") {
        if (!hiddenTargetRef.current && value > topOffset + threshold) {
          applyHidden(true);
        } else if (
          hiddenTargetRef.current &&
          delta < 0 &&
          value < topOffset + hysteresis
        ) {
          applyHidden(false);
        }
        return;
      }

      // Relative mode: delta from the last direction-change anchor.
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
    [
      applyHidden,
      threshold,
      topOffset,
      hideThreshold,
      showThreshold,
      hysteresis,
      mode,
    ],
  );

  const resetState = useCallback(
    (value: number) => {
      lastScrollValueRef.current = value;

      if (shouldDebugScroll()) {
        console.log("[scroll-debug][state] resetState", {
          mode,
          value,
          hidden: hiddenTargetRef.current,
        });
      }

      if (mode === "absolute") {
        if (value < topOffset + hysteresis) {
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
    [applyHidden, topOffset, hysteresis, mode],
  );

  const initialize = useCallback(
    (value: number) => {
      hiddenTargetRef.current = false;
      suppressedUntilRef.current = performance.now() + 120;
      lastScrollValueRef.current = value;

      if (shouldDebugScroll()) {
        console.log("[scroll-debug][state] initialize", {
          mode,
          value,
          threshold,
          hysteresis,
          topOffset,
          hideThreshold,
          showThreshold,
        });
      }

      if (mode === "absolute") {
        const shouldHide = value > topOffset + threshold;
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
    [threshold, topOffset, mode],
  );

  return { isHidden, suspend, onScroll, resetState, initialize };
}
