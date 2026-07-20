import { useLayoutEffect, useRef, useState } from "react";

import {
  clampPxPerHour,
  DEFAULT_PX_PER_HOUR,
  MAX_PX_PER_HOUR,
  MIN_PX_PER_HOUR,
  pxPerMinuteOf,
  ZOOM_STEP,
} from "../../lib/time-line-calendar/geometry";

// Vertical time-axis zoom for the calendar grid. `pxPerHour` is React state so
// event line-budgets recompute at the new scale; the +/- buttons and the
// two-finger pinch both feed it. Every zoom keeps a FOCAL point fixed on
// screen (the pinch midpoint, or the viewport centre for buttons) by adjusting
// the scroll container's `scrollTop` in a layout effect once the taller/shorter
// day has been laid out — so content doesn't jump under the fingers.
//
// Pinch updates are throttled to one animation frame so a rapid gesture never
// triggers more than 60 re-layouts/second.

type PinchState = {
  startDistance: number;
  startPxPerHour: number;
  // The time (minutes into the day) under the pinch midpoint at gesture start…
  focalMinute: number;
  // …and where that midpoint sits inside the scroll viewport (px from its top).
  focalViewportY: number;
};

function touchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;

  return Math.hypot(dx, dy);
}

function touchMidY(touches: React.TouchList): number {
  return (touches[0].clientY + touches[1].clientY) / 2;
}

export function useTimelineVerticalZoom(
  scrollRef: React.RefObject<HTMLDivElement | null>,
) {
  const [pxPerHour, setPxPerHour] = useState(DEFAULT_PX_PER_HOUR);
  const pxPerHourRef = useRef(pxPerHour);
  pxPerHourRef.current = pxPerHour;

  const pinchRef = useRef<PinchState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPxPerHourRef = useRef<number | null>(null);
  // Scroll to apply once the next zoomed layout has committed.
  const pendingScrollTopRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && pendingScrollTopRef.current !== null) {
      element.scrollTop = pendingScrollTopRef.current;
      pendingScrollTopRef.current = null;
    }
  }, [pxPerHour, scrollRef]);

  // Re-scale around a focal point: keep `focalMinute` pinned at `focalViewportY`.
  function zoomToFocal(
    nextPxPerHour: number,
    focalMinute: number,
    focalViewportY: number,
  ): void {
    const clamped = clampPxPerHour(nextPxPerHour);
    pendingScrollTopRef.current =
      focalMinute * pxPerMinuteOf(clamped) - focalViewportY;
    setPxPerHour(clamped);
  }

  function focalFromViewportY(viewportY: number): number {
    const element = scrollRef.current;
    const scrollTop = element?.scrollTop ?? 0;
    return (scrollTop + viewportY) / pxPerMinuteOf(pxPerHourRef.current);
  }

  function stepZoom(factor: number): void {
    const element = scrollRef.current;
    const viewportY = element ? element.clientHeight / 2 : 0;
    zoomToFocal(
      pxPerHourRef.current * factor,
      focalFromViewportY(viewportY),
      viewportY,
    );
  }

  function onTouchStart(event: React.TouchEvent): void {
    if (event.touches.length !== 2) {
      return;
    }
    const element = scrollRef.current;
    const rectTop = element?.getBoundingClientRect().top ?? 0;
    const midY = touchMidY(event.touches) - rectTop;
    pinchRef.current = {
      startDistance: touchDistance(event.touches),
      startPxPerHour: pxPerHourRef.current,
      focalMinute: focalFromViewportY(midY),
      focalViewportY: midY,
    };
  }

  function onTouchMove(event: React.TouchEvent): void {
    const pinch = pinchRef.current;
    if (!pinch || event.touches.length !== 2 || pinch.startDistance <= 0) {
      return;
    }

    const ratio = touchDistance(event.touches) / pinch.startDistance;
    pendingPxPerHourRef.current = clampPxPerHour(pinch.startPxPerHour * ratio);
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingPxPerHourRef.current;
      pendingPxPerHourRef.current = null;
      if (next !== null) {
        zoomToFocal(next, pinch.focalMinute, pinch.focalViewportY);
      }
    });
  }

  function endPinch(): void {
    pinchRef.current = null;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function onTouchEnd(event: React.TouchEvent): void {
    if (event.touches.length < 2) {
      endPinch();
    }
  }

  // React registers touchmove passively, so preventDefault there is ignored.
  // Attach a native non-passive listener to stop native pinch-zoom/scroll
  // while a two-finger axis-zoom is in progress.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const onNativeTouchMove = (nativeEvent: TouchEvent) => {
      if (pinchRef.current && nativeEvent.touches.length === 2) {
        nativeEvent.preventDefault();
      }
    };
    element.addEventListener("touchmove", onNativeTouchMove, { passive: false });

    return () => element.removeEventListener("touchmove", onNativeTouchMove);
  }, [scrollRef]);

  return {
    pxPerHour,
    pxPerMinute: pxPerMinuteOf(pxPerHour),
    canZoomIn: pxPerHour < MAX_PX_PER_HOUR,
    canZoomOut: pxPerHour > MIN_PX_PER_HOUR,
    zoomIn: () => stepZoom(ZOOM_STEP),
    zoomOut: () => stepZoom(1 / ZOOM_STEP),
    pinchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
}
