/**
 * Geometry and motion shared by the floating action buttons.
 *
 * Every FAB in the apps sits at the same anchor and moves on the same curve, so
 * swapping a menu for a single button (or back) reads as one control changing
 * its mind rather than two controls trading places.
 */

export const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

export const FAB_STAGGER_SECONDS = 0.03;

/** Distance from the trigger's centre to an expanded action's centre. */
export const FAB_ARC_RADIUS = 72;

export const FAB_ANCHOR_CLASS =
  "fixed bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4 z-40";

export const FAB_BUTTON_CLASS =
  "flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md disabled:opacity-50";
