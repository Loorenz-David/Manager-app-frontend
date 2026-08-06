/**
 * The nearest ancestor that scrolls vertically. Not necessarily the element's
 * offsetParent: several pages wrap the stack in a positioned (non-scrolling)
 * div inside a scroller further up (PullToRefresh) — the measurements must
 * still reach the real viewport.
 *
 * Identified by overflow style alone, deliberately NOT by
 * `scrollHeight > clientHeight`: an `overflow-y: auto` container whose
 * content doesn't overflow *yet* (a pane still showing its loading state) is
 * still the scroller, and the pane's activation effect must find it then —
 * otherwise no scroll listener attaches and the pane never records the
 * position the user later scrolls to.
 */
export function findNearestScroller(
  element: HTMLElement,
): HTMLElement | null {
  let candidate = element.parentElement;
  while (candidate) {
    const { overflowY } = getComputedStyle(candidate);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return candidate;
    }
    candidate = candidate.parentElement;
  }
  return null;
}
