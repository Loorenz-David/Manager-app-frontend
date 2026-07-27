import { useEffect, useRef } from "react";
import { animate, type MotionValue } from "framer-motion";
import { transitions } from "@beyo/lib";
import type { RefObject } from "react";

/** Finger travel (px) before the gesture commits to an axis. Below this the
 * touch is still a potential tap/scroll and the panel must not move. */
const AXIS_LOCK_DISTANCE = 10;
/** Fraction of the panel width past which a release commits the dismissal. */
const DISTANCE_THRESHOLD = 0.45;
/** Fling velocity (px/ms) past which a release commits regardless of distance. */
const VELOCITY_THRESHOLD = 0.35;

type UseSlideToDismissOptions = {
  /** Only the topmost, non-reduced-motion surface should respond. */
  enabled: boolean;
  /** Element the gesture listens on and is measured against (the panel). */
  panelRef: RefObject<HTMLDivElement | null>;
  /**
   * The panel's position MotionValue (single source of truth owned by the
   * surface — the same value its enter/exit animations drive). The drag
   * writes it directly; the backdrop and stack parallax derive from it.
   */
  x: MotionValue<number>;
  /**
   * Called once a release commits the dismissal. Return `true` if the surface
   * is actually closing (the panel finishes sliding off via its exit
   * animation) or `false` if the close was intercepted (e.g. a dirty-form
   * guard) so the panel springs back to rest.
   */
  onDismiss: () => boolean;
};

export function readPanelWidth(
  panelRef: RefObject<HTMLDivElement | null>,
): number {
  const measured = panelRef.current?.offsetWidth ?? 0;
  return measured > 0 ? measured : window.innerWidth;
}

/**
 * Signal to whatever is under the finger that the dismiss drag has taken over,
 * so its own gesture aborts. Mirrors the platform contract: when native
 * scrolling claims a touch the browser fires pointercancel, and well-built
 * press / long-press handlers already listen for it. Dispatched bubbling from
 * the start target so ancestors with gesture handlers cancel too.
 *
 * Deliberately pointercancel only — NOT a synthetic touchcancel: that would
 * bubble to this hook's own panel `touchcancel` listener and abort the drag we
 * just started. Modern gesture code (this codebase's ImagePreviewTile included)
 * is pointer-event based, so pointercancel is the right and sufficient signal.
 */
function cancelDescendantGestures(target: EventTarget | null): void {
  if (!(target instanceof Element)) return;
  if (typeof PointerEvent !== "function") return;
  target.dispatchEvent(
    new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
    }),
  );
}

/**
 * Whether the touch began inside a region that opted out of swipe-dismiss
 * (marked `data-slide-dismiss-ignore`) — e.g. a horizontal carousel or a
 * left/right-swipeable control that owns horizontal gestures. Explicit
 * attribute match only (walked to the panel); never a computed-style guess.
 */
export function startsInIgnoredRegion(
  target: EventTarget | null,
  panel: HTMLElement,
): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== panel) {
    if (element.hasAttribute("data-slide-dismiss-ignore")) return true;
    element = element.parentElement;
  }
  return false;
}

/**
 * iOS-style interactive dismiss: the panel tracks the finger on a
 * horizontal-dominant touch drag and, on release, finishes closing when the
 * threshold is met or springs back to rest otherwise.
 *
 * Implemented with raw touch listeners on purpose:
 * - framer's `drag` prop is unavailable (apps load `LazyMotion` with
 *   `domAnimation`, which excludes gesture features), and
 * - pointer-event gesture libraries proved unreliable here on real devices —
 *   the browser can steal the pointer stream mid-gesture (pointercancel),
 *   ending the gesture early and committing a close before the finger lifts.
 * With `touchmove` bound `passive: false`, calling `preventDefault()` once the
 * gesture locks horizontal guarantees the browser never takes over, so the
 * panel keeps following the finger and a close can only be decided in
 * `touchend`. Before the lock nothing is prevented, so taps and native
 * vertical scrolling behave exactly as usual. A vertical-dominant move rejects
 * the gesture and leaves scrolling native. Touch-only by design — desktop has
 * the header back button.
 */
export function useSlideToDismiss({
  enabled,
  panelRef,
  x,
  onDismiss,
}: UseSlideToDismissOptions): void {
  // Latest-ref so the listeners (bound once per enabled-cycle) always call the
  // current close funnel without re-subscribing every render.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) return;

    // idle → pending (finger down) → dragging (locked horizontal) | rejected
    // (vertical/multi-touch — ignore until the finger lifts).
    let mode: "idle" | "pending" | "dragging" | "rejected" = "idle";
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0; // px/ms, from the most recent move sample
    let startTarget: EventTarget | null = null;

    const settle = () => {
      void animate(x, 0, transitions.slide);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        mode = "rejected";
        return;
      }
      // A touch beginning inside an opted-out region is left entirely to that
      // region (and native scrolling); the panel never tracks it.
      if (startsInIgnoredRegion(event.target, panel)) {
        mode = "rejected";
        return;
      }
      const touch = event.touches[0];
      mode = "pending";
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastTime = performance.now();
      velocity = 0;
      startTarget = event.target;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (mode === "idle" || mode === "rejected") return;
      if (event.touches.length !== 1) {
        if (mode === "dragging") settle();
        mode = "rejected";
        return;
      }

      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === "pending") {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_DISTANCE) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical-dominant: native scrolling owns this touch.
          mode = "rejected";
          return;
        }
        mode = "dragging";
        x.stop(); // take over from any in-flight spring-back
        // Abort any gesture the finger started on (e.g. a hold-to-edit timer):
        // the dismiss drag now owns this touch.
        cancelDescendantGestures(startTarget);
      }

      // We own the gesture: block scrolling/native takeover for its remainder.
      event.preventDefault();

      const now = performance.now();
      const elapsed = now - lastTime;
      if (elapsed > 0) {
        velocity = (touch.clientX - lastX) / elapsed;
      }
      lastX = touch.clientX;
      lastTime = now;

      // Follow the finger; leftward overshoot is absorbed at the open position.
      x.set(Math.max(0, dx));
    };

    const handleTouchEnd = () => {
      if (mode === "dragging") {
        const width = readPanelWidth(panelRef);
        const offset = x.get();
        const committed =
          offset > width * DISTANCE_THRESHOLD ||
          (velocity > VELOCITY_THRESHOLD && offset > 0);

        // When closing, the surface unmounts and its AnimatePresence exit
        // animation finishes the slide-off from the current offset. Otherwise
        // (below threshold, or a dirty-form interceptor took the close) spring
        // back to rest.
        if (!committed || !onDismissRef.current()) {
          settle();
        }
      }
      mode = "idle";
    };

    const handleTouchCancel = () => {
      // The system took the touch (e.g. an incoming call sheet): never commit.
      if (mode === "dragging") settle();
      mode = "idle";
    };

    panel.addEventListener("touchstart", handleTouchStart, { passive: true });
    panel.addEventListener("touchmove", handleTouchMove, { passive: false });
    panel.addEventListener("touchend", handleTouchEnd);
    panel.addEventListener("touchcancel", handleTouchCancel);
    return () => {
      panel.removeEventListener("touchstart", handleTouchStart);
      panel.removeEventListener("touchmove", handleTouchMove);
      panel.removeEventListener("touchend", handleTouchEnd);
      panel.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [enabled, panelRef, x]);
}
