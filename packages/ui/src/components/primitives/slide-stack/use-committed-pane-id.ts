import { useCallback, useEffect, useRef, useState } from 'react';

import type { SlideStackDragType } from './slide-stack.types';

/**
 * How long the preview outlives the commit before giving up on it. A commit
 * normally lands (activeId changes) within one settle animation; when the
 * consumer declines to navigate, this mirrors the delay after which the pane
 * itself restores to rest, so chrome and pane undo together.
 */
const COMMIT_OPTIMISM_MS = 400;

type UseCommittedPaneIdOptions<T extends string> = {
  /** The stack's real active pane id. */
  activeId: T;
  /** Pane ids in stack order — the commit resolves to the neighbouring one. */
  paneIds: readonly T[];
};

type UseCommittedPaneIdResult<T extends string> = {
  /** Pane id the chrome should paint. */
  paneId: T;
  /** Hand to `<SlideStack onCommit={...} />`. */
  onCommit: (type: SlideStackDragType) => void;
};

/**
 * Keeps chrome *outside* a SlideStack — segmented pills, paginator dots, a
 * stepper, a title — in sync with the finger rather than with the navigation.
 *
 * A committed drag only calls onBack/onForward once its settle animation ends,
 * so anything painted from the real active id trails the gesture by a whole
 * transition. This returns the pane id that drag is heading for the instant it
 * commits, falling back to the real one at rest:
 *
 *   const { paneId, onCommit } = useCommittedPaneId({
 *     activeId: controller.activeTab,
 *     paneIds: controller.tabs,
 *   });
 *   <Header activeTab={paneId} />
 *   <SlideStack activeId={controller.activeTab} onCommit={onCommit} ... />
 *
 * The preview is optimistic: paint with it, but keep actions (mutations,
 * queries, anything with a side effect) on the real active id — a commit can
 * still be declined by the consumer, and the preview expires on its own.
 */
export function useCommittedPaneId<T extends string>({
  activeId,
  paneIds,
}: UseCommittedPaneIdOptions<T>): UseCommittedPaneIdResult<T> {
  const [committedId, setCommittedId] = useState<T | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  // Latest-refs keep onCommit stable across renders (pane id arrays are
  // usually rebuilt inline by the consumer).
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const paneIdsRef = useRef(paneIds);
  paneIdsRef.current = paneIds;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const onCommit = useCallback(
    (type: SlideStackDragType) => {
      const ids = paneIdsRef.current;
      const index = ids.indexOf(activeIdRef.current);
      const target = ids[type === 'back' ? index - 1 : index + 1];
      if (index < 0 || target === undefined) return;

      setCommittedId(target);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined;
        setCommittedId(null);
      }, COMMIT_OPTIMISM_MS);
    },
    [clearTimer],
  );

  useEffect(() => {
    // The navigation landed — the real id takes over from the guess.
    setCommittedId(null);
    clearTimer();
  }, [activeId, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // A preview whose pane has since disappeared (a list that reshaped under it)
  // is meaningless — fall back to the real id.
  const paneId =
    committedId !== null && paneIds.includes(committedId)
      ? committedId
      : activeId;

  return { paneId, onCommit };
}
