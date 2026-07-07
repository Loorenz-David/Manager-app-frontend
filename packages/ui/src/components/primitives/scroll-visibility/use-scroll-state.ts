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
  revealAtEdge?: "top" | "bottom";
  edgeOffset?: number;
  hysteresis: number;
  mode: "absolute" | "relative";
};

type ScrollEdgeMeta = {
  distanceFromStart: number;
  distanceFromEnd: number;
};

type RelativeChannel = {
  directionAnchorRef: React.MutableRefObject<number>;
  movingForwardRef: React.MutableRefObject<boolean>;
  progressRef: React.MutableRefObject<number>;
  progressAtAnchorRef: React.MutableRefObject<number>;
};

type ScrollStateResult = {
  isHidden: boolean;
  progressRef: React.MutableRefObject<number>;
  footerProgressRef: React.MutableRefObject<number>;
  isAtEdge: boolean;
  getSnapDirection: () => 0 | 1;
  getFooterSnapDirection: () => 0 | 1;
  snap: (
    snapTo: 0 | 1,
    currentScrollValue: number,
    footerSnapTo?: 0 | 1,
  ) => void;
  suspend: (durationMs?: number) => void;
  onScroll: (value: number, edgeMeta?: ScrollEdgeMeta) => void;
  resetState: (value: number) => void;
  initialize: (value: number) => void;
};

function stepRelativeChannel(
  channel: RelativeChannel,
  value: number,
  delta: number,
  hideThreshold: number,
  showThreshold: number,
): number {
  const movingForward = delta > 0;
  if (movingForward !== channel.movingForwardRef.current) {
    channel.movingForwardRef.current = movingForward;
    channel.directionAnchorRef.current = value;
    channel.progressAtAnchorRef.current = channel.progressRef.current;
  }

  const distanceFromAnchor = value - channel.directionAnchorRef.current;
  const thresholdForDirection = movingForward ? hideThreshold : showThreshold;
  const newProgress = Math.min(
    1,
    Math.max(
      0,
      channel.progressAtAnchorRef.current +
        distanceFromAnchor / thresholdForDirection,
    ),
  );

  channel.progressRef.current = newProgress;
  return newProgress;
}

function shouldDebugScroll(): boolean {
  return typeof window !== "undefined" && Boolean(window.__BEYO_SCROLL_DEBUG__);
}

export function useScrollState({
  threshold,
  topOffset,
  hideThreshold,
  showThreshold,
  revealAtEdge,
  edgeOffset,
  hysteresis,
  mode,
}: ScrollStateOptions): ScrollStateResult {
  const [isHidden, setIsHidden] = useState(false);
  const [isAtEdge, setIsAtEdge] = useState(false);
  const hiddenTargetRef = useRef(false);
  const suppressedUntilRef = useRef(0);

  // Relative mode: track the position where the user last changed direction.
  const lastScrollValueRef = useRef(0);
  const directionAnchorRef = useRef(0);
  const movingForwardRef = useRef(false); // "forward" = increasing value (down or up depending on inverted)
  const progressRef = useRef(0);
  const progressAtAnchorRef = useRef(0);
  const footerDirectionAnchorRef = useRef(0);
  const footerMovingForwardRef = useRef(false);
  const footerProgressRef = useRef(0);
  const footerProgressAtAnchorRef = useRef(0);
  const isAtEdgeRef = useRef(false);
  const revealAtEdgeRef = useRef(revealAtEdge);
  revealAtEdgeRef.current = revealAtEdge;
  const edgeOffsetRef = useRef(edgeOffset);
  edgeOffsetRef.current = edgeOffset;

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
    (value: number, edgeMeta?: ScrollEdgeMeta) => {
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

      const coreProgress = stepRelativeChannel(
        {
          directionAnchorRef,
          movingForwardRef,
          progressRef,
          progressAtAnchorRef,
        },
        value,
        delta,
        effectiveHideThreshold,
        effectiveShowThreshold,
      );

      if (!hiddenTargetRef.current && coreProgress >= 1) {
        applyHidden(true);
        directionAnchorRef.current = value;
        progressAtAnchorRef.current = 1;
      } else if (hiddenTargetRef.current && coreProgress <= 0) {
        applyHidden(false);
        directionAnchorRef.current = value;
        progressAtAnchorRef.current = 0;
      }

      const currentRevealAtEdge = revealAtEdgeRef.current;
      if (currentRevealAtEdge && edgeMeta) {
        const distanceToEdge =
          currentRevealAtEdge === "top"
            ? edgeMeta.distanceFromStart
            : edgeMeta.distanceFromEnd;

        if (distanceToEdge <= (edgeOffsetRef.current ?? 0)) {
          if (!isAtEdgeRef.current) {
            isAtEdgeRef.current = true;
            setIsAtEdge(true);
          }
          footerProgressRef.current = 0;
          footerProgressAtAnchorRef.current = 0;
          footerDirectionAnchorRef.current = value;
          footerMovingForwardRef.current = false;
          return;
        }

        if (isAtEdgeRef.current) {
          isAtEdgeRef.current = false;
          setIsAtEdge(false);
          footerDirectionAnchorRef.current = value;
          footerMovingForwardRef.current = false;
          footerProgressRef.current = 0;
          footerProgressAtAnchorRef.current = 0;
        }
      }

      stepRelativeChannel(
        {
          directionAnchorRef: footerDirectionAnchorRef,
          movingForwardRef: footerMovingForwardRef,
          progressRef: footerProgressRef,
          progressAtAnchorRef: footerProgressAtAnchorRef,
        },
        value,
        delta,
        effectiveHideThreshold,
        effectiveShowThreshold,
      );
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
        footerDirectionAnchorRef.current = value;
        footerMovingForwardRef.current = false;
        isAtEdgeRef.current = false;
        setIsAtEdge(false);
        progressRef.current = 0;
        progressAtAnchorRef.current = 0;
        footerProgressRef.current = 0;
        footerProgressAtAnchorRef.current = 0;
        applyHidden(false);
      }
    },
    [applyHidden, topOffset, hysteresis, mode],
  );

  const getSnapDirection = useCallback((): 0 | 1 => {
    return movingForwardRef.current ? 1 : 0;
  }, []);

  const getFooterSnapDirection = useCallback((): 0 | 1 => {
    if (isAtEdgeRef.current) {
      return 0;
    }

    return footerMovingForwardRef.current ? 1 : 0;
  }, []);

  const snap = useCallback(
    (snapTo: 0 | 1, currentScrollValue: number, footerSnapTo?: 0 | 1) => {
      progressRef.current = snapTo;
      progressAtAnchorRef.current = snapTo;
      lastScrollValueRef.current = currentScrollValue;
      directionAnchorRef.current = currentScrollValue;
      movingForwardRef.current = false;
      isAtEdgeRef.current = false;
      setIsAtEdge(false);
      if (footerSnapTo !== undefined) {
        footerProgressRef.current = footerSnapTo;
        footerProgressAtAnchorRef.current = footerSnapTo;
        footerDirectionAnchorRef.current = currentScrollValue;
        footerMovingForwardRef.current = false;
      }
      applyHidden(snapTo === 1);
    },
    [applyHidden],
  );

  const initialize = useCallback(
    (value: number) => {
      hiddenTargetRef.current = false;
      suppressedUntilRef.current = performance.now() + 120;
      lastScrollValueRef.current = value;
      isAtEdgeRef.current = false;
      setIsAtEdge(false);

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
        footerDirectionAnchorRef.current = value;
        footerMovingForwardRef.current = false;
        progressRef.current = 0;
        progressAtAnchorRef.current = 0;
        footerProgressRef.current = 0;
        footerProgressAtAnchorRef.current = 0;
      }
    },
    [threshold, topOffset, mode, hysteresis, hideThreshold, showThreshold],
  );

  return {
    isHidden,
    progressRef,
    footerProgressRef,
    isAtEdge,
    getSnapDirection,
    getFooterSnapDirection,
    snap,
    suspend,
    onScroll,
    resetState,
    initialize,
  };
}
