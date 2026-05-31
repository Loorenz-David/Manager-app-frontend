import { useCallback, useEffect, useRef } from "react";

import type {
  ScrollVisibilityContextValue,
  ScrollVisibilityOptions,
} from "./scroll-visibility.types";
import { useScrollState } from "./use-scroll-state";

type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

function getScrollValue(element: HTMLElement, inverted: boolean): number {
  if (!inverted) {
    return element.scrollTop;
  }

  return element.scrollHeight - element.clientHeight - element.scrollTop;
}

export function useScrollVisibility({
  threshold = 56,
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
}: ScrollVisibilityOptions = {}): UseScrollVisibilityResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isHidden, suspend, onScroll, resetState, initialize } = useScrollState(
    { threshold, hysteresis, mode },
  );

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    initialize(getScrollValue(element, inverted));

    const handler = () => {
      onScroll(getScrollValue(element, inverted));
    };

    element.addEventListener("scroll", handler, { passive: true });

    return () => {
      element.removeEventListener("scroll", handler);
    };
  }, [initialize, inverted, onScroll]);

  const reset = useCallback(() => {
    const element = scrollRef.current;
    resetState(element ? getScrollValue(element, inverted) : 0);
  }, [inverted, resetState]);

  return { scrollRef, isHidden, reset, suspend };
}
