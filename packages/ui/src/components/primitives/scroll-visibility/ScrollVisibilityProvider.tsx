import { useCallback, useEffect } from "react";

import { ScrollVisibilityContext } from "./ScrollVisibilityContext";
import type { ScrollVisibilityOptions } from "./scroll-visibility.types";
import { useScrollState } from "./use-scroll-state";

type ScrollVisibilityProviderProps = ScrollVisibilityOptions & {
  scrollElement: HTMLElement | null;
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
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
  children,
}: ScrollVisibilityProviderProps): React.JSX.Element {
  const { isHidden, suspend, onScroll, resetState, initialize } = useScrollState(
    { threshold, topOffset: 0, hysteresis, mode },
  );

  useEffect(() => {
    if (!scrollElement) {
      return;
    }

    initialize(getScrollValue(scrollElement, inverted));

    const handler = () => {
      onScroll(getScrollValue(scrollElement, inverted));
    };

    scrollElement.addEventListener("scroll", handler, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", handler);
    };
  }, [scrollElement, initialize, inverted, onScroll]);

  const reset = useCallback(() => {
    resetState(scrollElement ? getScrollValue(scrollElement, inverted) : 0);
  }, [inverted, resetState, scrollElement]);

  return (
    <ScrollVisibilityContext.Provider value={{ isHidden, reset, suspend }}>
      {children}
    </ScrollVisibilityContext.Provider>
  );
}
