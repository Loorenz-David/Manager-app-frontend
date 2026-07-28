import { useCallback, useEffect, useRef } from "react";

const SNAP_DURATION_MS = 400;
const EDGE_REVEAL_DURATION_MS = 160;
const CSS_VAR_PROGRESS = "--scroll-hide-progress";
const CSS_VAR_PROGRESS_FOOTER = "--scroll-hide-progress-footer";
const CSS_VAR_DURATION = "--scroll-snap-duration";
const CSS_VAR_DURATION_FOOTER = "--scroll-snap-duration-footer";
const VISUAL_SETTLED_EPSILON = 0.001;

// Ease-out approximation used to estimate mid-snap visual position when a
// new touchstart interrupts an in-progress snap CSS transition.
function easeOut(t: number): number {
  return t * (2 - t);
}

type UseScrollProgressCssVarOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  progressRef: React.MutableRefObject<number>;
  footerProgressRef?: React.MutableRefObject<number>;
  getSnapDirection: () => 0 | 1;
  getFooterSnapDirection?: () => 0 | 1;
  onSnapComplete: (snapTo: 0 | 1, footerSnapTo?: 0 | 1) => void;
  suspend: (durationMs?: number) => void;
};

type UseScrollProgressCssVarResult = {
  onProgress: (progress: number) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
  /**
   * Writes the given progress values straight to the CSS vars (duration 0)
   * and aligns the visual trackers. For initialize/reset, where the state
   * machine repositions without a scroll event — without this the DOM keeps
   * stale vars and the next touchstart resumes from the wrong position.
   */
  syncProgress: (progress: number, footerProgress?: number) => void;
};

export function useScrollProgressCssVar({
  containerRef,
  progressRef,
  footerProgressRef,
  getSnapDirection,
  getFooterSnapDirection,
  onSnapComplete,
  suspend,
}: UseScrollProgressCssVarOptions): UseScrollProgressCssVarResult {
  const snapRafRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const animRafRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);
  const isTouchActiveRef = useRef(false);
  // Tracks the progress value currently written to the CSS var.
  const visualProgressRef = useRef(0);
  const visualFooterProgressRef = useRef(0);

  // Snap state — stored so onTouchStart can estimate the mid-transition position
  // if the user taps while a CSS transition snap is in progress.
  const snapStartProgressRef = useRef(0);
  const footerSnapStartProgressRef = useRef(0);
  const snapStartTimeRef = useRef(0);
  const snapTargetRef = useRef<0 | 1>(0);
  const footerSnapTargetRef = useRef<0 | 1>(0);

  useEffect(() => {
    return () => {
      if (animRafRef.current !== null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      if (snapRafRef.current !== null) {
        cancelAnimationFrame(snapRafRef.current);
        snapRafRef.current = null;
      }
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }
    };
  }, []);

  const setVar = useCallback((el: HTMLElement, progress: number) => {
    el.style.setProperty(CSS_VAR_PROGRESS, String(progress));
  }, []);

  const setFooterVar = useCallback((el: HTMLElement, progress: number) => {
    el.style.setProperty(CSS_VAR_PROGRESS_FOOTER, String(progress));
  }, []);

  const setDuration = useCallback((el: HTMLElement, ms: number) => {
    el.style.setProperty(CSS_VAR_DURATION, `${ms}ms`);
  }, []);

  const setFooterDuration = useCallback((el: HTMLElement, ms: number) => {
    el.style.setProperty(CSS_VAR_DURATION_FOOTER, `${ms}ms`);
  }, []);

  const onProgress = useCallback(
    (_progress: number) => {
      const el = containerRef.current;
      if (!el) return;

      if (isSnappingRef.current) {
        // Edge reveal can become active while native momentum is still moving
        // and the release snap is suppressing directional state updates. Let
        // that authoritative footer value retarget an in-flight hide.
        if (
          footerProgressRef?.current === 0 &&
          footerSnapTargetRef.current !== 0
        ) {
          footerSnapTargetRef.current = 0;
          setFooterDuration(el, EDGE_REVEAL_DURATION_MS);
          setFooterVar(el, 0);
        }
        return;
      }

      // Coalesce all scroll events received before the next paint. The frame
      // performs all DOM writes together and reads the latest progress value,
      // so visual progress stays aligned with the native scroll instead of
      // recursively chasing it after scrolling.
      if (animRafRef.current !== null) return;

      animRafRef.current = requestAnimationFrame(() => {
        animRafRef.current = null;
        if (isSnappingRef.current) return;

        const next = progressRef.current;
        const footerTarget = footerProgressRef?.current;

        visualProgressRef.current = next;
        if (footerTarget !== undefined) {
          visualFooterProgressRef.current = footerTarget;
        }
        const e = containerRef.current;
        if (e && !isSnappingRef.current) {
          setDuration(e, 0);
          setVar(e, next);
          if (footerTarget !== undefined) {
            setFooterDuration(e, 0);
            setFooterVar(e, footerTarget);
          }
        }
      });
    },
    [
      containerRef,
      footerProgressRef,
      progressRef,
      setDuration,
      setFooterDuration,
      setFooterVar,
      setVar,
    ],
  );

  const triggerSnap = useCallback(() => {
    // touchend bubbles from the scroll element to document, where a fallback
    // listener is also registered. Only the first release for a gesture may
    // finalize or snap progress; a second call can otherwise reverse direction
    // after onSnapComplete resets the scroll state machine.
    if (isSnappingRef.current || !isTouchActiveRef.current) return;

    isTouchActiveRef.current = false;

    const snapTo: 0 | 1 = getSnapDirection();
    const footerSnapTo: 0 | 1 | undefined = footerProgressRef
      ? (getFooterSnapDirection ?? getSnapDirection)()
      : undefined;

    // Stop the pending progress write so it doesn't fight the CSS transition.
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }

    // A fast swipe can move logical progress to an endpoint before its pending
    // animation frame is painted. Decide from the last value actually written
    // to the visual container, otherwise touchend skips the transition and the
    // pending frame makes the header jump straight to 0 or 1.
    const coreVisuallySettled =
      Math.abs(visualProgressRef.current - snapTo) <= VISUAL_SETTLED_EPSILON;
    const footerVisuallySettled =
      footerSnapTo === undefined ||
      Math.abs(visualFooterProgressRef.current - footerSnapTo) <=
        VISUAL_SETTLED_EPSILON;

    if (coreVisuallySettled && footerVisuallySettled) {
      visualProgressRef.current = snapTo;
      if (footerSnapTo !== undefined) {
        visualFooterProgressRef.current = footerSnapTo;
      }
      onSnapComplete(snapTo, footerSnapTo);
      return;
    }

    isSnappingRef.current = true;
    suspend(SNAP_DURATION_MS + 60);

    // Record snap start state so onTouchStart can estimate mid-transition position.
    snapStartProgressRef.current = visualProgressRef.current;
    footerSnapStartProgressRef.current = visualFooterProgressRef.current;
    snapStartTimeRef.current = performance.now();
    snapTargetRef.current = snapTo;
    footerSnapTargetRef.current = footerSnapTo ?? 0;

    const el = containerRef.current;
    if (!el) {
      visualProgressRef.current = snapTo;
      if (footerSnapTo !== undefined) {
        visualFooterProgressRef.current = footerSnapTo;
      }
      onSnapComplete(snapTo, footerSnapTo);
      isSnappingRef.current = false;
      return;
    }

    setDuration(el, SNAP_DURATION_MS);
    if (footerSnapTo !== undefined) {
      setFooterDuration(el, SNAP_DURATION_MS);
    }

    snapRafRef.current = requestAnimationFrame(() => {
      setVar(el, snapTo);
      if (footerSnapTo !== undefined) {
        setFooterVar(el, footerSnapTargetRef.current);
      }
      snapRafRef.current = null;

      snapTimeoutRef.current = window.setTimeout(() => {
        const resolvedFooterSnapTo =
          footerSnapTo === undefined ? undefined : footerSnapTargetRef.current;
        visualProgressRef.current = snapTo;
        if (resolvedFooterSnapTo !== undefined) {
          visualFooterProgressRef.current = resolvedFooterSnapTo;
        }
        onSnapComplete(snapTo, resolvedFooterSnapTo);
        isSnappingRef.current = false;

        if (containerRef.current) {
          setDuration(containerRef.current, 0);
          if (resolvedFooterSnapTo !== undefined) {
            setFooterDuration(containerRef.current, 0);
          }
        }

        snapTimeoutRef.current = null;
      }, SNAP_DURATION_MS + 20);
    });
  }, [
    containerRef,
    footerProgressRef,
    getSnapDirection,
    getFooterSnapDirection,
    onSnapComplete,
    suspend,
    setDuration,
    setFooterDuration,
    setFooterVar,
    setVar,
  ]);

  const onTouchStart = useCallback(() => {
    if (snapRafRef.current !== null) {
      cancelAnimationFrame(snapRafRef.current);
      snapRafRef.current = null;
    }
    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }

    // Estimate where the CSS transition currently is so we can resume from
    // the correct visual position, not a stale progressRef or visualProgressRef.
    let resumeProgress: number;
    let resumeFooterProgress: number;
    if (isSnappingRef.current) {
      const elapsed = performance.now() - snapStartTimeRef.current;
      const t = Math.min(1, elapsed / SNAP_DURATION_MS);
      resumeProgress =
        snapStartProgressRef.current +
        (snapTargetRef.current - snapStartProgressRef.current) * easeOut(t);
      resumeFooterProgress =
        footerSnapStartProgressRef.current +
        (footerSnapTargetRef.current - footerSnapStartProgressRef.current) *
          easeOut(t);
    } else {
      // No snap in progress — use the current visual position.
      resumeProgress = visualProgressRef.current;
      resumeFooterProgress = visualFooterProgressRef.current;
    }

    isSnappingRef.current = false;
    isTouchActiveRef.current = true;

    // Align both refs to the estimated visual position so the next progress
    // write and scroll state machine resume from where the animation actually is.
    visualProgressRef.current = resumeProgress;
    progressRef.current = resumeProgress;
    visualFooterProgressRef.current = resumeFooterProgress;
    if (footerProgressRef) {
      footerProgressRef.current = resumeFooterProgress;
    }

    // Clear the suppress window — the user has physically started a new gesture
    // and scroll events from this point must be processed immediately.
    suspend(0);

    const el = containerRef.current;
    if (el) {
      setDuration(el, 0);
      setVar(el, resumeProgress);
      if (footerProgressRef) {
        setFooterDuration(el, 0);
        setFooterVar(el, resumeFooterProgress);
      }
    }
  }, [
    containerRef,
    footerProgressRef,
    progressRef,
    setDuration,
    setFooterDuration,
    setFooterVar,
    setVar,
    suspend,
  ]);

  const onTouchEnd = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  const onTouchCancel = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  const syncProgress = useCallback(
    (progress: number, footerProgress?: number) => {
      if (animRafRef.current !== null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }

      visualProgressRef.current = progress;
      if (footerProgress !== undefined) {
        visualFooterProgressRef.current = footerProgress;
      }

      const el = containerRef.current;
      if (!el) {
        return;
      }

      setDuration(el, 0);
      setVar(el, progress);
      if (footerProgress !== undefined) {
        setFooterDuration(el, 0);
        setFooterVar(el, footerProgress);
      }
    },
    [containerRef, setDuration, setFooterDuration, setFooterVar, setVar],
  );

  return { onProgress, onTouchStart, onTouchEnd, onTouchCancel, syncProgress };
}
