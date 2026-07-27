import { AnimatePresence, animate, useMotionValue } from 'framer-motion';
import {
  Children,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { transitions } from '@beyo/lib';

import { SurfaceHeaderContext } from '../../../providers/SurfaceProvider';
import { SlideStackContext } from './SlideStackContext';
import type {
  SlideStackCondition,
  SlideStackContextValue,
  SlideStackDirection,
  SlideStackDragType,
  SlideStackProps,
} from './slide-stack.types';

function resolveCondition(
  condition: SlideStackCondition | undefined,
): boolean | Promise<boolean> {
  if (typeof condition === 'function') {
    const result = condition();
    return typeof result === 'boolean' ? result : result.then(Boolean);
  }
  return condition !== false;
}

function collectPaneIds(children: React.ReactNode): string[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => (child as React.ReactElement<{ id?: string }>).props.id)
    .filter((id): id is string => typeof id === 'string');
}

function getPaneChild(
  children: React.ReactNode,
  paneId: string,
): React.ReactNode {
  return (
    Children.toArray(children).find(
      (child) =>
        isValidElement(child) &&
        (child as React.ReactElement<{ id: string }>).props.id === paneId,
    ) ?? null
  );
}

/** How long after a committed drag the suppress-enter flag self-clears when
 * the consumer declined to navigate. Mirrors the pane's restore delay. */
const SUPPRESS_ENTER_FALLBACK_MS = 400;

type DragState = {
  type: SlideStackDragType;
  ghostId: string;
  anchorTop: number;
  /** Set once the finger released and the settle animation is running. */
  settling?: boolean;
  settleTarget?: 0 | 1;
  /** Finalizer (navigation + cleanup) — idempotent; settleNow calls it early. */
  finish?: () => void;
};

/**
 * Shows one pane at a time with a stacked, native-feeling transition: the
 * later pane always layers on top of the earlier one. Panes overlap during
 * the transition (popLayout), so mount the stack inside a positioned
 * (`relative`) container that clips horizontal overflow.
 *
 * With `onBack`/`onForward`, the panes are interactively draggable: the pane
 * follows the finger (rightward reveals the previous pane beneath, leftward
 * pulls the next pane in on top) and a release past the threshold commits the
 * navigation. During a drag the stack renders a ghost copy of the target
 * pane; on commit the real pane replaces it settled in place (enter
 * suppressed), so the handoff is seamless.
 */
export function SlideStack({
  activeId,
  direction: directionProp,
  animateInitial = false,
  onBack,
  onForward,
  canBack,
  canForward,
  children,
}: SlideStackProps): React.JSX.Element {
  const paneIds = collectPaneIds(children);

  // Track the previous active pane so uncontrolled usage can infer direction
  // from pane order. State is adjusted during render (not in an effect) so the
  // outgoing pane exits with the correct direction on this very render.
  const [tracked, setTracked] = useState<{
    activeId: string;
    direction: SlideStackDirection;
  }>({ activeId, direction: 1 });

  let inferredDirection = tracked.direction;
  if (tracked.activeId !== activeId) {
    inferredDirection =
      paneIds.indexOf(activeId) >= paneIds.indexOf(tracked.activeId) ? 1 : -1;
    setTracked({ activeId, direction: inferredDirection });
  }

  const direction = directionProp ?? inferredDirection;

  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const onForwardRef = useRef(onForward);
  onForwardRef.current = onForward;
  const canBackRef = useRef(canBack);
  canBackRef.current = canBack;
  const canForwardRef = useRef(canForward);
  canForwardRef.current = canForward;
  const paneIdsRef = useRef(paneIds);
  paneIdsRef.current = paneIds;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // ── Interactive drag ──────────────────────────────────────────────────────
  // The active pane's gesture hook drives this controller. `dragProgress` is
  // the live finger progress (0..1 of pane width); the ghost pane derives its
  // pose from it, exactly like the surface derives backdrop/parallax from its
  // dragged MotionValue.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragProgress = useMotionValue(0);
  const suppressEnterRef = useRef(false);
  const settleControlsRef = useRef<{ stop: () => void } | null>(null);

  // A real navigation consumed the suppress flag; clear it after that render.
  useEffect(() => {
    suppressEnterRef.current = false;
  }, [activeId]);

  const dragController = useRef({
    // Availability + condition, side-effect free. A promise result means the
    // gesture waits, visually inert, and only engages if it resolves true.
    check: (type: SlideStackDragType): boolean | Promise<boolean> => {
      if (dragRef.current) return false;
      const ids = paneIdsRef.current;
      const index = ids.indexOf(activeIdRef.current);
      if (index < 0) return false;
      if (type === 'back') {
        if (!onBackRef.current || index === 0) return false;
        return resolveCondition(canBackRef.current);
      }
      if (!onForwardRef.current || index >= ids.length - 1) return false;
      return resolveCondition(canForwardRef.current);
    },
    engage: (type: SlideStackDragType, anchorTop = 0): boolean => {
      if (dragRef.current) return false;
      const ids = paneIdsRef.current;
      const index = ids.indexOf(activeIdRef.current);
      const ghostId = ids[type === 'back' ? index - 1 : index + 1];
      if (index < 0 || ghostId === undefined) return false;
      dragProgress.jump(0);
      const next = { type, ghostId, anchorTop };
      dragRef.current = next;
      setDrag(next);
      return true;
    },
    update: (progress: number): void => {
      dragProgress.set(Math.min(1, Math.max(0, progress)));
    },
    end: (committed: boolean): void => {
      const current = dragRef.current;
      if (!current || current.settling) return;
      current.settling = true;
      current.settleTarget = committed ? 1 : 0;

      const finish = () => {
        if (dragRef.current !== current) return;
        settleControlsRef.current = null;
        if (committed) {
          // The ghost now sits exactly where the real pane will render;
          // suppress that pane's enter so the swap is invisible. Navigation
          // and ghost removal land in the same render batch.
          suppressEnterRef.current = true;
          if (current.type === 'back') {
            onBackRef.current?.();
          } else {
            onForwardRef.current?.();
          }
          // If the consumer declined to navigate, don't let the flag leak
          // into the next real navigation.
          window.setTimeout(() => {
            suppressEnterRef.current = false;
          }, SUPPRESS_ENTER_FALLBACK_MS);
        }
        dragRef.current = null;
        setDrag(null);
      };

      const controls = animate(
        dragProgress,
        current.settleTarget,
        transitions.slide,
      );
      settleControlsRef.current = controls;
      void controls.then(finish);
      // Stash for settleNow, which finalizes synchronously (finish is
      // idempotent via the dragRef identity guard).
      current.finish = finish;
    },
    settleNow: (): void => {
      const current = dragRef.current;
      if (!current?.settling) return;
      dragProgress.jump(current.settleTarget ?? 0);
      settleControlsRef.current?.stop();
      current.finish?.();
    },
  }).current;

  // ── Host-surface integration ──────────────────────────────────────────────
  // While the stack is beyond its first pane, the enclosing slide surface's
  // dismiss gesture is muted entirely (the page must not track the finger) and
  // its close requests (header back arrow, any programmatic requestClose) pop
  // one pane instead of closing the page — the panes own the edge swipe. At
  // the first pane both controls are released and closing behaves normally.
  // The surface has a single interceptor/disabled slot, so a page must not
  // drive those itself while a deep stack with `onBack` is mounted.
  const surface = useContext(SurfaceHeaderContext);
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;
  const isBeyondFirstPane = paneIds.length > 0 && paneIds[0] !== activeId;
  const interceptClose = Boolean(surface && onBack && isBeyondFirstPane);

  // Deliberately NOT keyed on the surface object: registering the controls
  // makes the surface re-render, and a surface (or adapter) that provides a
  // per-render context value would re-fire this effect off its own setState,
  // looping forever. The ref always reaches the current surface.
  useEffect(() => {
    const currentSurface = surfaceRef.current;
    if (!interceptClose || !currentSurface) return;
    currentSurface.setSwipeDismissDisabled(true);
    currentSurface.setCloseInterceptor(() => onBackRef.current?.());
    return () => {
      currentSurface.setCloseInterceptor(null);
      currentSurface.setSwipeDismissDisabled(false);
    };
  }, [interceptClose]);

  const contextValue: SlideStackContextValue = {
    direction,
    activeId,
    suppressEnter: suppressEnterRef.current,
    drag: dragController,
  };

  return (
    <SlideStackContext.Provider value={contextValue}>
      <AnimatePresence custom={direction} initial={animateInitial} mode="popLayout">
        {getPaneChild(children, activeId)}
      </AnimatePresence>
      {drag ? (
        <SlideStackContext.Provider
          value={{
            ...contextValue,
            ghost: {
              type: drag.type === 'back' ? 'under' : 'over',
              progress: dragProgress,
              anchorTop: drag.anchorTop,
            },
          }}
        >
          {getPaneChild(children, drag.ghostId)}
        </SlideStackContext.Provider>
      ) : null}
    </SlideStackContext.Provider>
  );
}
