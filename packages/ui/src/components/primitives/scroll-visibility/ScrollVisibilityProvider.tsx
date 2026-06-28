import { useCallback, useEffect, useRef } from "react";

import { ScrollVisibilityContext } from "./ScrollVisibilityContext";
import type { ScrollVisibilityOptions } from "./scroll-visibility.types";
import { useScrollProgressCssVar } from "./use-scroll-progress-css-var";
import { useScrollState } from "./use-scroll-state";

type ScrollVisibilityProviderProps = ScrollVisibilityOptions & {
  scrollElement: HTMLElement | null;
  containerRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
};

function getScrollValue(element: HTMLElement, inverted: boolean): number {
  if (!inverted) {
    return element.scrollTop;
  }

  return element.scrollHeight - element.clientHeight - element.scrollTop;
}

export function ScrollVisibilityProvider({
  scrollElement,
  threshold = 56,
  hideThreshold,
  showThreshold,
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
  containerRef,
  children,
}: ScrollVisibilityProviderProps): React.JSX.Element {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const effectiveContainerRef = containerRef ?? internalContainerRef;
  const {
    isHidden,
    progressRef,
    getSnapDirection,
    snap,
    suspend,
    onScroll,
    resetState,
    initialize,
  } = useScrollState({
    threshold,
    topOffset: 0,
    hideThreshold,
    showThreshold,
    hysteresis,
    mode,
  });

  const onSnapComplete = useCallback(
    (snapTo: 0 | 1) => {
      const currentValue = scrollElement
        ? getScrollValue(scrollElement, inverted)
        : 0;
      snap(snapTo, currentValue);
    },
    [inverted, scrollElement, snap],
  );

  const { onProgress, onTouchStart, onTouchEnd, onTouchCancel } =
    useScrollProgressCssVar({
      containerRef: effectiveContainerRef,
      progressRef,
      getSnapDirection,
      onSnapComplete,
      suspend,
    });

  useEffect(() => {
    if (!scrollElement) {
      return;
    }

    initialize(getScrollValue(scrollElement, inverted));

    const handler = () => {
      onScroll(getScrollValue(scrollElement, inverted));
      if (mode === "relative") {
        onProgress(progressRef.current);
      }
    };

    scrollElement.addEventListener("scroll", handler, { passive: true });

    if (mode === "relative") {
      scrollElement.addEventListener("touchstart", onTouchStart, {
        passive: true,
      });
      scrollElement.addEventListener("touchend", onTouchEnd, {
        passive: true,
      });
      scrollElement.addEventListener("touchcancel", onTouchCancel, {
        passive: true,
      });
      document.addEventListener("touchend", onTouchEnd, { passive: true });
      document.addEventListener("touchcancel", onTouchCancel, {
        passive: true,
      });
    }

    return () => {
      scrollElement.removeEventListener("scroll", handler);
      if (mode === "relative") {
        scrollElement.removeEventListener("touchstart", onTouchStart);
        scrollElement.removeEventListener("touchend", onTouchEnd);
        scrollElement.removeEventListener("touchcancel", onTouchCancel);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("touchcancel", onTouchCancel);
      }
    };
  }, [
    scrollElement,
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
    resetState(scrollElement ? getScrollValue(scrollElement, inverted) : 0);
  }, [inverted, resetState, scrollElement]);

  return (
    <ScrollVisibilityContext.Provider value={{ isHidden, reset, suspend }}>
      <div ref={internalContainerRef} style={{ display: "contents" }}>
        {children}
      </div>
    </ScrollVisibilityContext.Provider>
  );
}
