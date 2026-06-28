import { useCallback, useEffect, useRef } from "react";

import type {
  ScrollVisibilityContextValue,
  ScrollVisibilityOptions,
} from "./scroll-visibility.types";
import { useScrollProgressCssVar } from "./use-scroll-progress-css-var";
import { useScrollState } from "./use-scroll-state";

type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  hideProgressContainerRef: React.RefObject<HTMLDivElement | null>;
};

function shouldDebugScroll(): boolean {
  return typeof window !== "undefined" && Boolean(window.__BEYO_SCROLL_DEBUG__);
}

function getScrollValue(element: HTMLElement, inverted: boolean): number {
  if (!inverted) {
    return element.scrollTop;
  }

  return element.scrollHeight - element.clientHeight - element.scrollTop;
}

export function useScrollVisibility({
  threshold = 56,
  topOffset = 0,
  hideThreshold,
  showThreshold,
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
}: ScrollVisibilityOptions = {}): UseScrollVisibilityResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideProgressContainerRef = useRef<HTMLDivElement>(null);
  const {
    isHidden,
    progressRef,
    getSnapDirection,
    snap,
    suspend,
    onScroll,
    resetState,
    initialize,
  } =
    useScrollState({
      threshold,
      topOffset,
      hideThreshold,
      showThreshold,
      hysteresis,
      mode,
    });

  const onSnapComplete = useCallback(
    (snapTo: 0 | 1) => {
      const element = scrollRef.current;
      const currentValue = element ? getScrollValue(element, inverted) : 0;
      snap(snapTo, currentValue);
    },
    [inverted, snap],
  );

  const { onProgress, onTouchStart, onTouchEnd, onTouchCancel } =
    useScrollProgressCssVar({
      containerRef: hideProgressContainerRef,
      progressRef,
      getSnapDirection,
      onSnapComplete,
      suspend,
    });

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    initialize(getScrollValue(element, inverted));

    if (shouldDebugScroll()) {
      console.log("[scroll-debug][visibility] init", {
        value: getScrollValue(element, inverted),
      });
    }

    const handler = () => {
      const value = getScrollValue(element, inverted);
      if (shouldDebugScroll()) {
        console.log("[scroll-debug][visibility] scroll", {
          value,
          scrollTop: element.scrollTop,
        });
      }
      onScroll(value);
      if (mode === "relative") {
        onProgress(progressRef.current);
      }
    };

    element.addEventListener("scroll", handler, { passive: true });

    if (mode === "relative") {
      element.addEventListener("touchstart", onTouchStart, { passive: true });
      element.addEventListener("touchend", onTouchEnd, { passive: true });
      element.addEventListener("touchcancel", onTouchCancel, {
        passive: true,
      });
      document.addEventListener("touchend", onTouchEnd, { passive: true });
      document.addEventListener("touchcancel", onTouchCancel, {
        passive: true,
      });
    }

    return () => {
      element.removeEventListener("scroll", handler);
      if (mode === "relative") {
        element.removeEventListener("touchstart", onTouchStart);
        element.removeEventListener("touchend", onTouchEnd);
        element.removeEventListener("touchcancel", onTouchCancel);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("touchcancel", onTouchCancel);
      }
    };
  }, [
    initialize,
    inverted,
    mode,
    onProgress,
    onScroll,
    onTouchCancel,
    onTouchEnd,
    onTouchStart,
    progressRef,
  ]);

  const reset = useCallback(() => {
    const element = scrollRef.current;
    if (shouldDebugScroll()) {
      console.log("[scroll-debug][visibility] reset", {
        value: element ? getScrollValue(element, inverted) : 0,
      });
    }
    resetState(element ? getScrollValue(element, inverted) : 0);
  }, [inverted, resetState]);

  return { scrollRef, hideProgressContainerRef, isHidden, reset, suspend };
}
