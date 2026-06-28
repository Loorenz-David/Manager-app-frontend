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
  progressRef: React.MutableRefObject<number>;
  getSnapDirection: () => 0 | 1;
  snap: (snapTo: 0 | 1, currentScrollValue: number) => void;
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
  const progressRef = useRef(0);
  const progressAtAnchorRef = useRef(0);

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

      const effectiveHideThreshold = Math.max(1, hideThreshold ?? threshold);
      const effectiveShowThreshold = Math.max(1, showThreshold ?? threshold);
      const movingForward = delta > 0;
      if (movingForward !== movingForwardRef.current) {
        // Direction reversed — reset the anchor to the current position.
        movingForwardRef.current = movingForward;
        directionAnchorRef.current = value;
        progressAtAnchorRef.current = progressRef.current;
      }

      const distanceFromAnchor = value - directionAnchorRef.current;
      const thresholdForDirection = movingForward
        ? effectiveHideThreshold
        : effectiveShowThreshold;
      const newProgress = Math.min(
        1,
        Math.max(
          0,
          progressAtAnchorRef.current +
            distanceFromAnchor / thresholdForDirection,
        ),
      );

      progressRef.current = newProgress;

      if (!hiddenTargetRef.current && newProgress >= 1) {
        applyHidden(true);
        directionAnchorRef.current = value;
        progressAtAnchorRef.current = 1;
      } else if (hiddenTargetRef.current && newProgress <= 0) {
        applyHidden(false);
        directionAnchorRef.current = value;
        progressAtAnchorRef.current = 0;
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
        progressRef.current = 0;
        progressAtAnchorRef.current = 0;
        applyHidden(false);
      }
    },
    [applyHidden, topOffset, hysteresis, mode],
  );

  const getSnapDirection = useCallback((): 0 | 1 => {
    return movingForwardRef.current ? 1 : 0;
  }, []);

  const snap = useCallback(
    (snapTo: 0 | 1, currentScrollValue: number) => {
      progressRef.current = snapTo;
      progressAtAnchorRef.current = snapTo;
      lastScrollValueRef.current = currentScrollValue;
      directionAnchorRef.current = currentScrollValue;
      movingForwardRef.current = false;
      applyHidden(snapTo === 1);
    },
    [applyHidden],
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
        progressRef.current = 0;
        progressAtAnchorRef.current = 0;
      }
    },
    [threshold, topOffset, mode, hysteresis, hideThreshold, showThreshold],
  );

  return {
    isHidden,
    progressRef,
    getSnapDirection,
    snap,
    suspend,
    onScroll,
    resetState,
    initialize,
  };
}
