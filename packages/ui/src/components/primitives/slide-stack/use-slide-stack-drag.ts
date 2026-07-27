import { useEffect, useRef } from 'react';
import { animate, type MotionValue } from 'framer-motion';
import type { RefObject } from 'react';

import { transitions } from '@beyo/lib';

import { startsInIgnoredRegion } from '../../surfaces/use-slide-to-dismiss';
import { slideStackPose } from './slide-stack.variants';
import type {
  SlideStackDragController,
  SlideStackDragType,
} from './slide-stack.types';

/** Finger travel (px) before the gesture commits to an axis. Below this the
 * touch is still a potential tap/scroll and the pane must not move. */
const AXIS_LOCK_DISTANCE = 10;
/** Fraction of the pane width past which a release commits the navigation. */
const DISTANCE_THRESHOLD = 0.45;
/** Fling velocity (px/ms) past which a release commits regardless of distance. */
const VELOCITY_THRESHOLD = 0.35;
/** How long after a committed drag the pane waits before concluding the
 * consumer declined to navigate (it is still mounted and active) and
 * restoring itself to rest. Longer than the settle transition. */
const RESTORE_CHECK_DELAY_MS = 400;

type UseSlideStackDragOptions = {
  /** Element the gesture listens on and is measured against (the pane). */
  targetRef: RefObject<HTMLDivElement | null>;
  /** The pane's own position/opacity MotionValues (the same ones its enter/
   * center/exit variants animate) — the drag writes them directly, exactly
   * like the surface dismiss drag writes the panel's MotionValue. */
  x: MotionValue<string | number>;
  opacity: MotionValue<number>;
  controller: SlideStackDragController;
  /** Whether this pane is still the stack's active pane. Guards the
   * post-commit restore: a pane that is exiting after a successful
   * navigation must never have its exit animation hijacked. */
  isActive: () => boolean;
};

function paneWidth(target: HTMLElement): number {
  return target.offsetWidth > 0 ? target.offsetWidth : window.innerWidth;
}

/**
 * Interactive pane drag for SlideStack, mirroring the surface dismiss
 * gesture's strategy (raw touch listeners, axis lock, `preventDefault` once
 * horizontal owns the touch, thresholds on release — see use-slide-to-dismiss
 * for why touch events over pointer events). Two directions:
 *
 * - rightward (back): this pane follows the finger off to the right, fading,
 *   while the stack reveals the previous pane beneath (under-ghost).
 * - leftward (forward): the stack slides the next pane in on top following
 *   the finger (over-ghost) while this pane recedes proportionally.
 *
 * A direction only engages if controller.begin() accepts it, so a rightward
 * drag on the first pane falls through untouched to the surface's own
 * slide-to-close.
 */
export function useSlideStackDrag({
  targetRef,
  x,
  opacity,
  controller,
  isActive,
}: UseSlideStackDragOptions): void {
  // Latest-refs so the listeners (bound once) always reach current values.
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    // idle → pending (finger down) → dragging (locked horizontal) | awaiting
    // (locked, async condition still resolving — finger tracked, nothing
    // moves) | rejected (vertical/multi-touch/unavailable direction — ignore
    // until lift).
    let mode: 'idle' | 'pending' | 'awaiting' | 'dragging' | 'rejected' = 'idle';
    let dragType: SlideStackDragType = 'back';
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0; // px/ms, from the most recent move sample
    let progress = 0; // 0..1 of pane width
    let restoreTimer: number | undefined;
    // Invalidates an in-flight async condition when the touch that asked for
    // it is no longer alive (lifted, cancelled, or a new touch started).
    let gestureId = 0;

    const applyPose = (p: number) => {
      if (dragType === 'back') {
        x.set(`${p * 100}%`);
        opacity.set(1 - slideStackPose.backDragFade * p);
      } else {
        x.set(`${slideStackPose.underRestX * p}%`);
        opacity.set(
          1 - (1 - slideStackPose.underRestOpacity) * p,
        );
      }
    };

    // Where the ghost pane gets pinned: this pane's own flow position (below
    // any header/timeline the consumer renders above the panes). When the
    // user has scrolled past that point, pin to the viewport top instead so
    // the ghost is actually visible during the drag.
    const ghostAnchorTop = (): number => {
      const parent = target.offsetParent;
      const scrollTop = parent instanceof HTMLElement ? parent.scrollTop : 0;
      return Math.max(target.offsetTop, scrollTop);
    };

    const settleSelf = (committed: boolean) => {
      const targets = committed
        ? dragType === 'back'
          ? { x: '100%', opacity: 0 }
          : {
              x: `${slideStackPose.underRestX}%`,
              opacity: slideStackPose.underRestOpacity,
            }
        : { x: '0%', opacity: 1 };
      void animate(x, targets.x, transitions.slide);
      void animate(opacity, targets.opacity, transitions.slide);
    };

    const handleTouchStart = (event: TouchEvent) => {
      gestureId += 1;
      // A previous drag still settling? Finalize it right now (navigation
      // included) so consecutive swipes never wait out the settle animation.
      controllerRef.current.settleNow();
      if (restoreTimer !== undefined) {
        window.clearTimeout(restoreTimer);
        restoreTimer = undefined;
      }
      // Only the live active pane tracks touches — an exiting copy of this
      // pane (kept mounted for its exit animation) must stay inert.
      if (!isActiveRef.current()) {
        mode = 'rejected';
        return;
      }
      if (event.touches.length !== 1) {
        mode = 'rejected';
        return;
      }
      if (startsInIgnoredRegion(event.target, target)) {
        mode = 'rejected';
        return;
      }
      const touch = event.touches[0];
      mode = 'pending';
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastTime = performance.now();
      velocity = 0;
      progress = 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (mode === 'idle' || mode === 'rejected') return;
      if (event.touches.length !== 1) {
        if (mode === 'dragging') {
          settleSelf(false);
          controllerRef.current.end(false);
        }
        mode = 'rejected';
        return;
      }

      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === 'pending') {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_DISTANCE) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical-dominant: native scrolling owns this touch.
          mode = 'rejected';
          return;
        }
        // The pane may have stopped being active mid-touch (a settleNow on
        // touchstart finalized a pending navigation): never drag a pane that
        // is on its way out.
        if (!isActiveRef.current()) {
          mode = 'rejected';
          return;
        }
        const type: SlideStackDragType = dx > 0 ? 'back' : 'forward';
        const verdict = controllerRef.current.check(type);
        if (verdict === false) {
          // Direction unavailable here (e.g. back on the first pane, or a
          // condition said no): leave the touch to the surface's own
          // slide-to-close.
          mode = 'rejected';
          return;
        }
        dragType = type;
        if (verdict === true) {
          if (!controllerRef.current.engage(type, ghostAnchorTop())) {
            mode = 'rejected';
            return;
          }
          mode = 'dragging';
          x.stop(); // take over from any in-flight settle
          opacity.stop();
        } else {
          // Async condition (e.g. form validation): keep tracking the finger
          // but move nothing until it allows the drag. If it resolves after
          // the finger lifted (or a new touch started), do nothing.
          mode = 'awaiting';
          const requestingGesture = gestureId;
          void verdict.then((allowed) => {
            if (gestureId !== requestingGesture || mode !== 'awaiting') return;
            if (allowed && controllerRef.current.engage(dragType, ghostAnchorTop())) {
              mode = 'dragging';
              x.stop();
              opacity.stop();
              // Catch up to wherever the finger already is.
              applyPose(progress);
              controllerRef.current.update(progress);
            } else {
              mode = 'rejected';
            }
          });
        }
      }

      // We own the gesture: block scrolling/native takeover for its remainder.
      // (Not cancelable when the scroll container already started scrolling —
      // preventDefault would be ignored with a console intervention.)
      if (event.cancelable) event.preventDefault();

      const now = performance.now();
      const elapsed = now - lastTime;
      if (elapsed > 0) {
        velocity = (touch.clientX - lastX) / elapsed;
      }
      lastX = touch.clientX;
      lastTime = now;

      const travel = dragType === 'back' ? dx : -dx;
      progress = Math.min(1, Math.max(0, travel / paneWidth(target)));
      if (mode === 'dragging') {
        applyPose(progress);
        controllerRef.current.update(progress);
      }
    };

    const handleTouchEnd = () => {
      gestureId += 1;
      if (mode === 'dragging') {
        const directionalVelocity = dragType === 'back' ? velocity : -velocity;
        const committed =
          progress > DISTANCE_THRESHOLD ||
          (directionalVelocity > VELOCITY_THRESHOLD && progress > 0);

        settleSelf(committed);
        controllerRef.current.end(committed);

        if (committed) {
          // If the consumer declines to navigate (e.g. forward validation
          // fails), this pane stays the active one — bring it back to rest
          // instead of leaving it stranded mid-pose. The isActive guard is
          // load-bearing: after a real navigation this pane is exiting, and
          // restoring it would hijack the exit animation, so AnimatePresence
          // would never unmount it (a stuck pane covering the stack).
          restoreTimer = window.setTimeout(() => {
            restoreTimer = undefined;
            if (isActiveRef.current() && target.isConnected) {
              void animate(x, '0%', transitions.slide);
              void animate(opacity, 1, transitions.slide);
            }
          }, RESTORE_CHECK_DELAY_MS);
        }
      }
      mode = 'idle';
    };

    const handleTouchCancel = () => {
      gestureId += 1;
      // The system took the touch (e.g. an incoming call sheet): never commit.
      if (mode === 'dragging') {
        settleSelf(false);
        controllerRef.current.end(false);
      }
      mode = 'idle';
    };

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchCancel);
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
      // Unmounted mid-drag (finger still down): release the drag slot, or
      // every future drag would be refused forever — the touchend that
      // normally releases it dies with this element.
      if (mode === 'dragging') {
        controllerRef.current.end(false);
      }
      gestureId += 1;
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [targetRef, x, opacity]);
}
