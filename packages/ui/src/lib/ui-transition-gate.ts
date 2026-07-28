/**
 * A single gate for "the UI is mid-transition, hold heavy work".
 *
 * Two things make a list stutter right after the user acts on a row:
 *  - a slide/sheet closing while the list underneath re-renders, and
 *  - a refetch landing while a row is still playing its removal animation.
 *
 * Surfaces and `AnimatedRemovalItem` hold a token for as long as they are
 * animating; anything queued through `runWhenUiSettled` waits until the last
 * token is released. The intended order is: surface closes → the row animates
 * out → the refetch lands.
 *
 * Deliberately module-level rather than context: the queue is consumed by
 * mutation callbacks (`onSettled`), which run outside the React tree.
 *
 * Queueing a `mutate()` from a surface that is closing is safe — the mutation
 * still runs after its owner unmounts, along with the callbacks declared in
 * `useMutation({...})`. Per-*call* callbacks (`mutate(vars, { onSuccess })`)
 * are dropped once the component is gone, so keep that work in the mutation's
 * own options or in a `mutateAsync().then()`.
 */

/**
 * How long after a surface starts closing the list commit fires — i.e. how
 * much later the row's removal animation begins than the surface's close.
 *
 * 0 starts both at the same instant. Raise it to stagger the removal into the
 * close; it is the one knob for that timing.
 */
export const LIST_COMMIT_DELAY_MS = 0;

let activeTransitions = 0;
let queue: Array<() => void> = [];
let flushHandle: number | null = null;

function scheduleFlush(): void {
  if (flushHandle !== null || queue.length === 0) {
    return;
  }

  const raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) =>
          setTimeout(() => callback(0), 16) as unknown as number;

  flushHandle = raf(() => {
    flushHandle = null;

    // Still animating: a later release re-schedules the flush.
    if (activeTransitions > 0) {
      return;
    }

    const pending = queue;
    queue = [];
    pending.forEach((work) => {
      work();
    });
  });
}

/**
 * Marks the start of a UI transition. Call the returned function when it ends;
 * it is idempotent, so an unmount cleanup can call it safely.
 */
export function beginUiTransition(): () => void {
  activeTransitions += 1;
  let isReleased = false;

  return () => {
    if (isReleased) {
      return;
    }

    isReleased = true;
    activeTransitions = Math.max(0, activeTransitions - 1);
    scheduleFlush();
  };
}

/**
 * Runs `work` once no transition is in flight. With nothing animating it still
 * defers by a frame, which lets the current commit paint first.
 */
export function runWhenUiSettled(work: () => void): void {
  queue.push(work);
  scheduleFlush();
}

/**
 * Commits list-mutating work (the optimistic patch that makes a row leave)
 * alongside a closing surface, rather than after it: call `requestClose()`
 * first, then this. With `LIST_COMMIT_DELAY_MS` at 0 the row starts animating
 * out in the same tick the surface starts closing.
 *
 * Note this is the opposite of `runWhenUiSettled`, which is for the expensive
 * follow-up — the refetch — and must stay behind every animation.
 */
export function scheduleListCommit(work: () => void): void {
  if (LIST_COMMIT_DELAY_MS <= 0) {
    // Same tick as the close, so React batches both into one commit.
    work();
    return;
  }

  setTimeout(work, LIST_COMMIT_DELAY_MS);
}

/** True while any surface or row animation holds the gate. Test/debug aid. */
export function isUiTransitioning(): boolean {
  return activeTransitions > 0;
}

/** Test hook: drop queued work and reset the counter. */
export function resetUiTransitionGate(): void {
  activeTransitions = 0;
  queue = [];
  flushHandle = null;
}
