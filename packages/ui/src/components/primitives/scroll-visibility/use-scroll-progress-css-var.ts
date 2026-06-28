import { useCallback, useEffect, useRef } from "react";

const SNAP_DURATION_MS = 400;
const CSS_VAR_PROGRESS = "--scroll-hide-progress";
const CSS_VAR_DURATION = "--scroll-snap-duration";

// Fraction of remaining distance closed per animation frame (≈60fps baseline).
// Caps the visual rate for fast touch drags while still tracking slow/pinch scroll closely.
const LERP_FACTOR = 0.2;
const CONVERGE_THRESHOLD = 0.004;

// Ease-out approximation used to estimate mid-snap visual position when a
// new touchstart interrupts an in-progress snap CSS transition.
function easeOut(t: number): number {
  return t * (2 - t);
}

type UseScrollProgressCssVarOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  progressRef: React.MutableRefObject<number>;
  getSnapDirection: () => 0 | 1;
  onSnapComplete: (snapTo: 0 | 1) => void;
  suspend: (durationMs?: number) => void;
};

type UseScrollProgressCssVarResult = {
  onProgress: (progress: number) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

export function useScrollProgressCssVar({
  containerRef,
  progressRef,
  getSnapDirection,
  onSnapComplete,
  suspend,
}: UseScrollProgressCssVarOptions): UseScrollProgressCssVarResult {
  const snapRafRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const animRafRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);
  const isTouchActiveRef = useRef(false);
  // Tracks the progress value currently written to the CSS var (may lag behind
  // progressRef during a fast touch drag — that lag is intentional smoothing).
  const visualProgressRef = useRef(0);

  // Snap state — stored so onTouchStart can estimate the mid-transition position
  // if the user taps while a CSS transition snap is in progress.
  const snapStartProgressRef = useRef(0);
  const snapStartTimeRef = useRef(0);
  const snapTargetRef = useRef<0 | 1>(0);

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

  const setDuration = useCallback((el: HTMLElement, ms: number) => {
    el.style.setProperty(CSS_VAR_DURATION, `${ms}ms`);
  }, []);

  const onProgress = useCallback(
    (_progress: number) => {
      if (isSnappingRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      setDuration(el, 0);

      // If a lerp frame is already scheduled it will pick up the latest
      // progressRef.current on its next tick — no need to schedule another.
      if (animRafRef.current !== null) return;

      // Named function so it can recursively schedule itself until convergence.
      function frame() {
        animRafRef.current = null;
        if (isSnappingRef.current) return;

        const target = progressRef.current;
        const current = visualProgressRef.current;
        const diff = target - current;

        let next: number;
        if (Math.abs(diff) < CONVERGE_THRESHOLD) {
          next = target; // close enough — snap to avoid infinite loop
        } else {
          next = current + diff * LERP_FACTOR;
          animRafRef.current = requestAnimationFrame(frame); // keep chasing target
        }

        visualProgressRef.current = next;
        const e = containerRef.current;
        if (e && !isSnappingRef.current) setVar(e, next);
      }

      animRafRef.current = requestAnimationFrame(frame);
    },
    [containerRef, progressRef, setDuration, setVar],
  );

  const triggerSnap = useCallback(() => {
    if (isSnappingRef.current) return;

    isTouchActiveRef.current = false;

    const progress = progressRef.current;
    if (progress <= 0 || progress >= 1) return;

    // Stop the lerp loop so it doesn't fight the CSS transition during snap.
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }

    const snapTo: 0 | 1 = getSnapDirection();
    isSnappingRef.current = true;
    suspend(SNAP_DURATION_MS + 60);

    // Record snap start state so onTouchStart can estimate mid-transition position.
    snapStartProgressRef.current = visualProgressRef.current;
    snapStartTimeRef.current = performance.now();
    snapTargetRef.current = snapTo;

    const el = containerRef.current;
    if (!el) {
      visualProgressRef.current = snapTo;
      onSnapComplete(snapTo);
      isSnappingRef.current = false;
      return;
    }

    setDuration(el, SNAP_DURATION_MS);

    snapRafRef.current = requestAnimationFrame(() => {
      setVar(el, snapTo);
      snapRafRef.current = null;

      snapTimeoutRef.current = window.setTimeout(() => {
        visualProgressRef.current = snapTo;
        onSnapComplete(snapTo);
        isSnappingRef.current = false;

        if (containerRef.current) {
          setDuration(containerRef.current, 0);
        }

        snapTimeoutRef.current = null;
      }, SNAP_DURATION_MS + 20);
    });
  }, [
    containerRef,
    progressRef,
    getSnapDirection,
    onSnapComplete,
    suspend,
    setDuration,
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
    if (isSnappingRef.current) {
      const elapsed = performance.now() - snapStartTimeRef.current;
      const t = Math.min(1, elapsed / SNAP_DURATION_MS);
      resumeProgress =
        snapStartProgressRef.current +
        (snapTargetRef.current - snapStartProgressRef.current) * easeOut(t);
    } else {
      // No snap in progress — use the current visual position (lerp may lag
      // slightly behind progressRef; visual position is what the user sees).
      resumeProgress = visualProgressRef.current;
    }

    isSnappingRef.current = false;
    isTouchActiveRef.current = true;

    // Align both refs to the estimated visual position so the lerp loop and
    // scroll state machine both resume from where the animation actually is.
    visualProgressRef.current = resumeProgress;
    progressRef.current = resumeProgress;

    // Clear the suppress window — the user has physically started a new gesture
    // and scroll events from this point must be processed immediately.
    suspend(0);

    const el = containerRef.current;
    if (el) {
      setDuration(el, 0);
      setVar(el, resumeProgress);
    }
  }, [containerRef, progressRef, setDuration, setVar, suspend]);

  const onTouchEnd = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  const onTouchCancel = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  return { onProgress, onTouchStart, onTouchEnd, onTouchCancel };
}
