import { useLayoutEffect, useRef } from "react";

/**
 * The collapsed card's scroll window, built the way a phone clock's time
 * picker is: the platform owns the gesture. The viewport is a real native
 * scroll container and CSS `scroll-snap-type: y mandatory` (applied by the
 * component) is what clamps every fling to a row boundary — so momentum,
 * deceleration and the snap all feel exactly like the OS, because they are
 * the OS.
 *
 * What is left for JavaScript is only what CSS cannot express:
 *
 *   - the window's height — "three rows" is not a constant pixel figure,
 *     because active rows carry metric grids; the height is remeasured from
 *     the three rows under the window each time the scroll settles, and
 *     eased between values;
 *   - opening on the anchor row, and gliding to a new anchor when a section
 *     goes live.
 */

/** Native scroll fires no reliable `scrollend` everywhere; settle by silence. */
const SETTLE_DEBOUNCE_MS = 120;

const HEIGHT_TRANSITION = "height 260ms cubic-bezier(0.22, 0.61, 0.36, 1)";

type SnapScrollOptions = {
  rowCount: number;
  visibleRowCount: number;
  /** Row the window auto-scrolls to; see `selectAnchorRowIndex`. */
  anchorIndex: number;
};

export type SnapScrollHandle = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useSnapScroll({
  rowCount,
  visibleRowCount,
  anchorIndex,
}: SnapScrollOptions): SnapScrollHandle {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Row offsetTops — the snap positions. Index 0 is always 0. */
  const offsetsRef = useRef<number[]>([]);
  const contentHeightRef = useRef(0);
  const heightAppliedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleRowCountRef = useRef(visibleRowCount);
  visibleRowCountRef.current = visibleRowCount;
  const maxIndexRef = useRef(0);
  maxIndexRef.current = Math.max(0, rowCount - visibleRowCount);

  const nearestIndex = (top: number): number => {
    const offsets = offsetsRef.current;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index <= maxIndexRef.current; index += 1) {
      const distance = Math.abs((offsets[index] ?? 0) - top);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    return best;
  };

  /** Window height = the `visibleRowCount` rows starting at `index`. */
  const applyHeight = (index: number): void => {
    const viewport = viewportRef.current;
    const offsets = offsetsRef.current;
    if (!viewport || contentHeightRef.current <= 0) {
      // jsdom (or an unmeasured first pass): leave the height alone.
      return;
    }

    const top = offsets[index] ?? 0;
    const bottom =
      offsets[index + visibleRowCountRef.current] ?? contentHeightRef.current;
    const height = Math.max(0, bottom - top);

    if (!heightAppliedRef.current) {
      // First paint: land on the height, then start easing between snaps.
      viewport.style.transition = "none";
      viewport.style.height = `${height}px`;
      requestAnimationFrame(() => {
        viewport.style.transition = HEIGHT_TRANSITION;
      });
      heightAppliedRef.current = true;
      return;
    }

    viewport.style.height = `${height}px`;
  };

  const scrollToIndex = (index: number, smooth: boolean): void => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const top = offsetsRef.current[index] ?? 0;

    // Height first: the scroll range only reaches `top` once the window has
    // shrunk to its three-row size.
    applyHeight(index);

    if (smooth && !prefersReducedMotion() && typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ top, behavior: "smooth" });
    } else {
      viewport.scrollTop = top;
    }
  };

  const measure = (): void => {
    const list = listRef.current;
    const viewport = viewportRef.current;
    if (!list || !viewport) {
      return;
    }

    // Rect differences, not `offsetTop`: nothing in this card is a positioned
    // ancestor, so `offsetTop` would be relative to some page container and
    // inflate every snap offset by whatever sits above the list.
    const listTop = list.getBoundingClientRect().top;
    const offsets: number[] = [];
    for (const child of Array.from(list.children)) {
      offsets.push(Math.round(child.getBoundingClientRect().top - listTop));
    }
    offsetsRef.current = offsets;
    contentHeightRef.current = list.scrollHeight;
    applyHeight(nearestIndex(viewport.scrollTop));
  };

  // Measure, observe row resizes, and open on the anchor before first paint.
  useLayoutEffect(() => {
    measure();
    scrollToIndex(Math.min(anchorIndex, maxIndexRef.current), false);

    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(list);
    for (const child of Array.from(list.children)) {
      observer.observe(child);
    }

    return () => {
      observer.disconnect();
    };
    // Remount-level inputs only; anchor *changes* are handled below.
  }, [rowCount, visibleRowCount]);

  // A new anchor (a section just went live) glides into the window.
  const previousAnchorRef = useRef(anchorIndex);
  useLayoutEffect(() => {
    if (previousAnchorRef.current === anchorIndex) {
      return;
    }
    previousAnchorRef.current = anchorIndex;
    scrollToIndex(Math.min(anchorIndex, maxIndexRef.current), true);
  }, [anchorIndex]);

  // Re-fit the window once the native scroll goes quiet on a snap position.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const onScroll = (): void => {
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        applyHeight(nearestIndex(viewport.scrollTop));
      }, SETTLE_DEBOUNCE_MS);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, []);

  return { viewportRef, listRef };
}
