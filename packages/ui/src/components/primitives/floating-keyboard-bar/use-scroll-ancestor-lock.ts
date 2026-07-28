import { useLayoutEffect, useRef } from "react";

/**
 * Freezes the scroll container the anchor element lives in.
 *
 * This is the companion to `useBodyScrollLock` for content that does **not**
 * scroll the document: inside a surface, the scrolling element is a nested
 * `overflow-y-auto` div, so locking `document.body` would freeze nothing.
 * `overflow-y: hidden` keeps the container's current `scrollTop`, so the page
 * behind stays exactly where the user left it.
 */
function findScrollableAncestor(
  element: HTMLElement | null,
): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current && current !== document.body) {
    const { overflowY } = getComputedStyle(current);

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

export function useScrollAncestorLock(
  getAnchor: () => HTMLElement | null,
  locked: boolean,
): void {
  // Held in a ref so a caller may pass an inline closure without relocking on
  // every render — the anchor is only read when the lock engages.
  const getAnchorRef = useRef(getAnchor);
  getAnchorRef.current = getAnchor;

  useLayoutEffect(() => {
    if (!locked) {
      return;
    }

    const container = findScrollableAncestor(getAnchorRef.current());

    if (!container) {
      return;
    }

    const previousOverflowY = container.style.overflowY;
    const previousOverscrollBehaviorY = container.style.overscrollBehaviorY;

    container.style.overflowY = "hidden";
    container.style.overscrollBehaviorY = "none";

    return () => {
      container.style.overflowY = previousOverflowY;
      container.style.overscrollBehaviorY = previousOverscrollBehaviorY;
    };
  }, [locked]);
}
