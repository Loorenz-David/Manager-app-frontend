import { transitions } from '@beyo/lib';

import type { SlideStackDirection } from './slide-stack.types';

/**
 * Shared pose constants — the animated variants, the interactive drag and the
 * ghost panes all derive from these so a drag released mid-way and a plain
 * navigation land on identical geometry.
 */
export const slideStackPose = {
  /** X offset (%) the incoming pane enters from on a forward navigation. */
  enterOffsetX: 28,
  /** X offset (%) the outgoing pane exits to on a back navigation. */
  exitOffsetX: 32,
  /** Resting recede X offset (%) of the pane beneath the top one. */
  underRestX: -6,
  /** Resting dim of the pane beneath the top one. */
  underRestOpacity: 0.7,
  /** Fraction of the pane the dragged top pane fades over on a back drag. */
  backDragFade: 0.6,
  /** Drag progress by which the incoming over-ghost is fully opaque. */
  overFadeWindow: 0.6,
} as const;

// Stacked card transition: the later pane always layers on top of the earlier
// one. Forward slides the new pane in over the resting pane; back slides the
// top pane off to the right, revealing the pane beneath. Only transform and
// opacity animate so image-heavy panes stay on the compositor.
export const slideStackPaneVariants = {
  enter: (direction: SlideStackDirection) =>
    direction > 0
      ? { x: `${slideStackPose.enterOffsetX}%`, opacity: 0, zIndex: 2 }
      : {
          x: `${slideStackPose.underRestX}%`,
          opacity: slideStackPose.underRestOpacity,
          zIndex: 1,
        },
  center: (direction: SlideStackDirection) => ({
    x: 0,
    opacity: 1,
    zIndex: direction > 0 ? 2 : 1,
  }),
  exit: (direction: SlideStackDirection) =>
    direction > 0
      ? {
          x: `${slideStackPose.underRestX}%`,
          opacity: slideStackPose.underRestOpacity,
          zIndex: 1,
        }
      : { x: `${slideStackPose.exitOffsetX}%`, opacity: 0, zIndex: 2 },
} as const;

// zIndex must swap instantly — a tweened z-index would leave both panes on the
// same layer mid-transition.
export const slideStackPaneTransition = {
  ...transitions.slide,
  zIndex: { duration: 0 },
} as const;
