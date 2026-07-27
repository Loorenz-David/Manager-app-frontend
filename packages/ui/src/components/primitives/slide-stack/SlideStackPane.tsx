import { useCallback, useRef } from 'react';
import { m, useIsPresent, useMotionValue, useTransform } from 'framer-motion';

import { cn } from '@beyo/lib';

import { useSlideStackContext } from './SlideStackContext';
import { useSlideStackDrag } from './use-slide-stack-drag';
import {
  slideStackPaneTransition,
  slideStackPaneVariants,
  slideStackPose,
} from './slide-stack.variants';
import type { SlideStackGhostPose, SlideStackPaneProps } from './slide-stack.types';

const PANE_BASE_CLASSES =
  // relative: zIndex is ignored on statically positioned elements.
  // bg-background: the top pane must be opaque to cover the pane beneath.
  'relative w-full bg-background';

export function SlideStackPane(props: SlideStackPaneProps): React.JSX.Element {
  const { ghost } = useSlideStackContext();
  return ghost ? <GhostPane {...props} ghost={ghost} /> : <ActivePane {...props} />;
}

function ActivePane({
  id,
  children,
  className,
  'data-testid': testId,
  ref,
}: SlideStackPaneProps): React.JSX.Element {
  const { direction, activeId, suppressEnter, drag } = useSlideStackContext();
  const isActiveRef = useRef(true);
  isActiveRef.current = activeId === id;
  // An exiting pane can sit above the new active pane (back navigation exits
  // on top) — it must never swallow the touches meant for the live pane.
  // useIsPresent (not usePresence): the read-only variant, so AnimatePresence
  // still removes the pane on its own once the exit animation finishes.
  const isPresent = useIsPresent();

  // The pane's position/opacity as adopted MotionValues: the enter/center/exit
  // variants animate these same values, and the interactive drag writes them
  // directly — one source of truth, mirroring the surface's panelX strategy.
  const x = useMotionValue<string | number>(0);
  const opacity = useMotionValue(1);

  // Local handle on the pane element for the drag listeners, merged with the
  // ref AnimatePresence (popLayout) forwards to measure the exiting pane.
  const paneRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      paneRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  useSlideStackDrag({
    targetRef: paneRef,
    x,
    opacity,
    controller: drag,
    isActive: () => isActiveRef.current,
  });

  return (
    <m.div
      key={id}
      ref={setRefs}
      animate="center"
      className={cn(PANE_BASE_CLASSES, className)}
      custom={direction}
      data-testid={testId ?? `slide-stack-pane-${id}`}
      exit="exit"
      // After a committed drag the ghost already stands exactly where this
      // pane belongs: mount settled instead of replaying the enter.
      initial={suppressEnter ? false : 'enter'}
      style={{ x, opacity, pointerEvents: isPresent ? undefined : 'none' }}
      transition={slideStackPaneTransition}
      variants={slideStackPaneVariants}
    >
      {children}
    </m.div>
  );
}

/**
 * The stand-in copy of the drag's target pane, mounted only while a drag is
 * in progress. Pose is a pure derivation of the live drag progress:
 * - 'under' (back drag): the previous pane beneath, un-receding from its
 *   resting recede toward rest as the top pane is pulled away.
 * - 'over' (forward drag): the next pane tracking the finger in from the
 *   right edge, on top of the panes only.
 * Pinned at the dragged pane's own flow offset (ghost.anchorTop), so content
 * the consumer renders above the panes — headers, timelines — stays above
 * the transition instead of being covered by a full-page slide.
 */
function GhostPane({
  id,
  children,
  className,
  'data-testid': testId,
  ghost,
}: SlideStackPaneProps & { ghost: SlideStackGhostPose }): React.JSX.Element {
  const x = useTransform(ghost.progress, (p) =>
    ghost.type === 'under'
      ? `${slideStackPose.underRestX * (1 - p)}%`
      : `${(1 - p) * 100}%`,
  );
  const opacity = useTransform(ghost.progress, (p) =>
    ghost.type === 'under'
      ? slideStackPose.underRestOpacity +
        (1 - slideStackPose.underRestOpacity) * p
      : Math.min(1, p / slideStackPose.overFadeWindow),
  );

  return (
    <m.div
      // pointer-events-none: the ghost is a visual stand-in only — touches
      // must reach the real panes beneath it (e.g. to fast-forward a settle).
      className={cn(
        PANE_BASE_CLASSES,
        'pointer-events-none absolute inset-x-0 min-h-full',
        className,
      )}
      data-testid={`${testId ?? `slide-stack-pane-${id}`}-ghost`}
      style={{
        top: ghost.anchorTop,
        x,
        opacity,
        zIndex: ghost.type === 'under' ? 0 : 3,
      }}
    >
      {children}
    </m.div>
  );
}
