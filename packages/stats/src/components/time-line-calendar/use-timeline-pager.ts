import { useEffect, useRef } from "react";

import {
  applyEdgeResistance,
  computeReleaseVelocity,
  resolvePanAxis,
  resolvePanSettle,
  SETTLE_DURATION_MS,
  type PanAxis,
  type PanSample,
} from "../../lib/time-line-calendar/pager";

// Google-Calendar-style horizontal date pager. The track (three pages wide:
// prev | current | next) rests at translateX(-100%) so the current page fills
// the viewport. A horizontal drag moves the track live with the finger; on
// release it settles: commit to the adjacent page (parent state changes, the
// track is repositioned so the committed page keeps its on-screen position,
// then eases to center) or snap back. All transforms are applied imperatively
// to the track element — no per-frame React renders.
//
// Reliability rules baked in:
// - Axis lock: mostly-vertical movement hands the gesture to native scroll;
//   once locked horizontal, native touchmove is preventDefault-ed so the grid
//   doesn't scroll diagonally mid-pan.
// - Only the primary pointer pans; a second finger (pinch) cancels the pan.
// - A completed pan suppresses the trailing click so event blocks don't open.
// - The future clamp rubber-bands (resistance) and never commits.

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: PanAxis | null;
  width: number;
  dx: number;
  samples: PanSample[];
};

type Options = {
  // Days per full page (1 in single-day mode, 3 in three-day mode).
  spanDays: number;
  // Days remaining until today from the focus date (0 at the clamp).
  maxNextDays: number;
  onNavigate: (direction: "prev" | "next", days: number) => void;
};

const REST_TRANSFORM = "translateX(-100%)";
const MAX_VELOCITY_SAMPLES = 6;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

export function useTimelinePager({ spanDays, maxNextDays, onNavigate }: Options) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<PanState | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  // Handlers read the latest values through refs so they stay stable.
  const spanDaysRef = useRef(spanDays);
  spanDaysRef.current = spanDays;
  const maxNextDaysRef = useRef(maxNextDays);
  maxNextDaysRef.current = maxNextDays;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  function clearSettleTimer(): void {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }

  function restoreRest(): void {
    const track = trackRef.current;
    if (track) {
      track.style.transition = "";
      track.style.transform = REST_TRANSFORM;
    }
  }

  // Ease the track to the centered position, then normalize back to the
  // percentage rest transform (resize-safe). Timeout-based so it also works
  // under prefers-reduced-motion (where no transitionend would fire).
  function settleToCenter(width: number): void {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const duration = prefersReducedMotion() ? 0 : SETTLE_DURATION_MS;
    track.style.transition = duration
      ? `transform ${duration}ms cubic-bezier(0.2, 0, 0, 1)`
      : "none";
    // Force a style flush so the transition picks up the current transform.
    void track.getBoundingClientRect();
    track.style.transform = `translateX(${-width}px)`;

    clearSettleTimer();
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      restoreRest();
    }, duration + 30);
  }

  function onPointerDown(event: React.PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    // A second finger means pinch — drop any in-flight pan.
    if (!event.isPrimary) {
      panRef.current = null;
      return;
    }

    // Interrupt an in-flight settle: jump to rest (content is committed).
    if (settleTimerRef.current !== null) {
      clearSettleTimer();
      restoreRest();
    }

    suppressClickRef.current = false;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      width: viewportRef.current?.getBoundingClientRect().width ?? 0,
      dx: 0,
      samples: [{ t: event.timeStamp, x: event.clientX }],
    };
  }

  function onPointerMove(event: React.PointerEvent): void {
    const pan = panRef.current;
    if (!pan || event.pointerId !== pan.pointerId) {
      return;
    }

    const rawDx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;

    if (pan.axis === null) {
      pan.axis = resolvePanAxis(rawDx, dy);
      if (pan.axis === "y") {
        // Native vertical scroll owns the gesture.
        panRef.current = null;
        return;
      }
      if (pan.axis === "x") {
        try {
          viewportRef.current?.setPointerCapture(event.pointerId);
        } catch {
          // Capture is best-effort (e.g. pointer already gone).
        }
      }
    }
    if (pan.axis !== "x") {
      return;
    }

    pan.dx = applyEdgeResistance(rawDx, maxNextDaysRef.current > 0);
    pan.samples.push({ t: event.timeStamp, x: event.clientX });
    if (pan.samples.length > MAX_VELOCITY_SAMPLES) {
      pan.samples.shift();
    }

    const track = trackRef.current;
    if (track && pan.width > 0) {
      track.style.transition = "none";
      track.style.transform = `translateX(${-pan.width + pan.dx}px)`;
    }
  }

  function onPointerUp(event: React.PointerEvent): void {
    const pan = panRef.current;
    panRef.current = null;
    if (!pan || pan.axis !== "x" || pan.width <= 0) {
      return;
    }

    // A real pan happened — swallow the trailing click on whatever is under
    // the pointer (mouse fires it regardless of drag distance).
    suppressClickRef.current = true;

    const velocityX = computeReleaseVelocity(
      pan.samples,
      event.timeStamp,
      event.clientX,
    );
    const settle = resolvePanSettle({
      dx: pan.dx,
      velocityX,
      viewportWidth: pan.width,
      spanDays: spanDaysRef.current,
      maxNextDays: maxNextDaysRef.current,
    });

    const track = trackRef.current;
    if (!track) {
      return;
    }

    if (settle.kind === "stay") {
      settleToCenter(pan.width);
      return;
    }

    // Commit: the pages form one contiguous date strip, so a commit of N days
    // shifts the strip by N column widths. Reposition the track for the
    // post-commit arrangement so every date keeps its exact on-screen
    // position, let React re-render with the new dates, then ease to center.
    const columnWidth = pan.width / spanDaysRef.current;
    const offset = settle.days * columnWidth;
    track.style.transition = "none";
    track.style.transform =
      settle.direction === "next"
        ? `translateX(${-pan.width + pan.dx + offset}px)`
        : `translateX(${-pan.width + pan.dx - offset}px)`;
    onNavigateRef.current(settle.direction, settle.days);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => settleToCenter(pan.width));
    });
  }

  function onPointerCancel(): void {
    const pan = panRef.current;
    panRef.current = null;
    if (pan?.axis === "x" && pan.width > 0) {
      settleToCenter(pan.width);
    }
  }

  function onClickCapture(event: React.MouseEvent): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // While locked horizontal, block native vertical scrolling (the container
  // has touch-action: pan-y) so the grid doesn't drift diagonally mid-pan.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onNativeTouchMove = (event: TouchEvent) => {
      if (panRef.current?.axis === "x") {
        event.preventDefault();
      }
    };
    viewport.addEventListener("touchmove", onNativeTouchMove, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("touchmove", onNativeTouchMove);
    };
  }, []);

  useEffect(() => clearSettleTimer, []);

  return {
    viewportRef,
    trackRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
  };
}
