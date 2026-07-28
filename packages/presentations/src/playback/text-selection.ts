/**
 * Long-press-to-select over the player's tap zones.
 *
 * The tap overlay covers the whole deck so pause/next/previous are reliable, which also
 * means the browser can never start a selection on the text underneath. Long press
 * therefore selects programmatically, and the overlay stands down while a selection is
 * live so the user can adjust it, copy, or dismiss it.
 */

export const LONG_PRESS_MS = 450;
/** Past this the gesture is a drag, not a press. */
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

const TEXT_ELEMENT_SELECTOR = '[data-element-type="text"]';

/**
 * Topmost rendered text element containing the point. `elementFromPoint` is useless here
 * — it would return the tap overlay — so this hit-tests the rendered rects directly and
 * takes the last match, which is the one painted on top.
 */
export function findTextElementAtPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (const node of root.querySelectorAll<HTMLElement>(TEXT_ELEMENT_SELECTOR)) {
    const rect = node.getBoundingClientRect();
    if (
      clientX >= rect.left && clientX <= rect.right
      && clientY >= rect.top && clientY <= rect.bottom
    ) found = node;
  }
  return found;
}

/** Selects the whole text block under the point. Returns false when there is none. */
export function selectTextAtPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const target = findTextElementAtPoint(root, clientX, clientY);
  if (!target) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(target);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export function hasActiveTextSelection(): boolean {
  const selection = window.getSelection();
  return selection !== null && selection.rangeCount > 0 && !selection.isCollapsed;
}

export function clearTextSelection(): void {
  window.getSelection()?.removeAllRanges();
}
