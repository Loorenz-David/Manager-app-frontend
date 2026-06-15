import { useCallback, useEffect, useRef } from "react";

import type {
  ScrollVisibilityContextValue,
  ScrollVisibilityOptions,
} from "./scroll-visibility.types";
import { useScrollState } from "./use-scroll-state";

type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  scrollRef: React.RefObject<HTMLDivElement | null>;
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
  const { isHidden, suspend, onScroll, resetState, initialize } =
    useScrollState({
      threshold,
      topOffset,
      hideThreshold,
      showThreshold,
      hysteresis,
      mode,
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
    };

    element.addEventListener("scroll", handler, { passive: true });

    return () => {
      element.removeEventListener("scroll", handler);
    };
  }, [initialize, inverted, onScroll]);

  const reset = useCallback(() => {
    const element = scrollRef.current;
    if (shouldDebugScroll()) {
      console.log("[scroll-debug][visibility] reset", {
        value: element ? getScrollValue(element, inverted) : 0,
      });
    }
    resetState(element ? getScrollValue(element, inverted) : 0);
  }, [inverted, resetState]);

  return { scrollRef, isHidden, reset, suspend };
}
