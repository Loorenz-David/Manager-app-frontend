import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ScrollVisibilityContextValue,
  ScrollVisibilityOptions,
} from "./scroll-visibility.types";
import { useScrollProgressCssVar } from "./use-scroll-progress-css-var";
import { useScrollState } from "./use-scroll-state";

type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  isAtEdge: boolean;
  /**
   * The secondary (footer) channel's hidden state. Prefer this over deriving
   * `isHidden && !isAtEdge`, which cannot express `revealOnlyAtEdge`'s sticky
   * reveal.
   */
  isFooterHidden: boolean;
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

/**
 * A ref object that also reports attachment as state.
 *
 * Consumers commonly render a loading/error branch before the scroll container
 * (`if (isPending) return <Spinner />`), so on a cold mount the ref is still
 * null when effects first run. A plain `useRef` never notifies anyone when the
 * node arrives, which used to leave the scroll listener permanently unbound —
 * the visibility system then looked dead for the whole life of the page.
 * Exposing the node as state re-runs the binding effect on every attach,
 * detach, or swap, no matter which component's render mounted it.
 */
function useObservedElementRef<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  T | null,
] {
  const [element, setElement] = useState<T | null>(null);

  const ref = useMemo(() => {
    let current: T | null = null;

    return {
      get current(): T | null {
        return current;
      },
      set current(next: T | null) {
        if (next === current) {
          return;
        }

        current = next;
        // React assigns refs during commit, so this behaves exactly like a
        // callback ref calling setState.
        setElement(next);
      },
    } as React.RefObject<T | null>;
  }, []);

  return [ref, element];
}

export function useScrollVisibility({
  threshold = 56,
  topOffset = 0,
  hideThreshold,
  showThreshold,
  revealAtEdge,
  edgeOffset = 0,
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
}: ScrollVisibilityOptions = {}): UseScrollVisibilityResult {
  const [scrollRef, scrollElement] = useObservedElementRef<HTMLDivElement>();
  const hideProgressContainerRef = useRef<HTMLDivElement>(null);
  const revealAtEdgeRef = useRef(revealAtEdge);
  revealAtEdgeRef.current = revealAtEdge;
  const {
    isHidden,
    isFooterHidden,
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
  } = useScrollState({
    threshold,
    topOffset,
    hideThreshold,
    showThreshold,
    revealAtEdge,
    edgeOffset,
    hysteresis,
    mode,
  });

  const onSnapComplete = useCallback(
    (snapTo: 0 | 1, footerSnapTo?: 0 | 1) => {
      const element = scrollRef.current;
      const currentValue = element ? getScrollValue(element, inverted) : 0;
      snap(snapTo, currentValue, footerSnapTo);
    },
    [inverted, snap],
  );

  const { onProgress, onTouchStart, onTouchEnd, onTouchCancel, syncProgress } =
    useScrollProgressCssVar({
      containerRef: hideProgressContainerRef,
      progressRef,
      footerProgressRef:
        revealAtEdge !== undefined ? footerProgressRef : undefined,
      getSnapDirection,
      getFooterSnapDirection:
        revealAtEdge !== undefined ? getFooterSnapDirection : undefined,
      onSnapComplete,
      suspend,
    });

  useEffect(() => {
    const element = scrollElement;

    if (!element) {
      return;
    }

    initialize(getScrollValue(element, inverted));
    // initialize repositions the state machine without a scroll event (e.g.
    // reveal-only-at-edge starts the footer channel hidden) — push that
    // position into the CSS vars so the DOM starts where the state is.
    syncProgress(
      progressRef.current,
      revealAtEdgeRef.current !== undefined
        ? footerProgressRef.current
        : undefined,
    );

    if (shouldDebugScroll()) {
      console.log("[scroll-debug][visibility] init", {
        value: getScrollValue(element, inverted),
      });
    }

    const handler = () => {
      const value = getScrollValue(element, inverted);
      const edgeMeta =
        revealAtEdgeRef.current !== undefined
          ? {
              distanceFromStart: element.scrollTop,
              distanceFromEnd:
                element.scrollHeight - element.clientHeight - element.scrollTop,
            }
          : undefined;
      if (shouldDebugScroll()) {
        console.log("[scroll-debug][visibility] scroll", {
          value,
          scrollTop: element.scrollTop,
        });
      }
      onScroll(value, edgeMeta);
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
    footerProgressRef,
    initialize,
    inverted,
    mode,
    onProgress,
    onScroll,
    onTouchCancel,
    onTouchEnd,
    onTouchStart,
    progressRef,
    scrollElement,
    syncProgress,
  ]);

  const reset = useCallback(() => {
    const element = scrollRef.current;
    if (shouldDebugScroll()) {
      console.log("[scroll-debug][visibility] reset", {
        value: element ? getScrollValue(element, inverted) : 0,
      });
    }
    resetState(element ? getScrollValue(element, inverted) : 0);
    syncProgress(
      progressRef.current,
      revealAtEdgeRef.current !== undefined
        ? footerProgressRef.current
        : undefined,
    );
  }, [footerProgressRef, inverted, progressRef, resetState, syncProgress]);

  return {
    scrollRef,
    hideProgressContainerRef,
    isHidden,
    isFooterHidden,
    isAtEdge,
    reset,
    suspend,
  };
}
