import type { ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import { durations, easings } from "@beyo/lib";

/**
 * Animated removal for list rows: the removed row slides out to the right and
 * collapses its height, so the rows beneath glide up through normal document
 * flow to cover the space. Enter/initial renders are untouched — only removal
 * animates.
 *
 * Usage: wrap the keyed row elements in <AnimatedRemovalGroup> and each
 * removable row in <AnimatedRemovalItem key={...}>. Works under LazyMotion
 * `domAnimation` — deliberately no `layout` projection (that requires domMax).
 */
export function AnimatedRemovalGroup({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

type AnimatedRemovalItemProps = {
  children: ReactNode;
  /**
   * The parent flex container's gap in px (e.g. 16 for `gap-4`). The exit also
   * animates this away as negative margin: when the element unmounts, its
   * vanished gap slot and the negative margin cancel out — no end-of-animation
   * snap of the rows below.
   */
  gapPx?: number;
  className?: string;
};

const SLIDE_TRANSITION = {
  duration: durations.slow,
  ease: easings.standard,
} as const;

const COLLAPSE_TRANSITION = {
  delay: durations.base,
  duration: durations.slow,
  ease: easings.standard,
} as const;

export function AnimatedRemovalItem({
  children,
  gapPx = 16,
  className,
}: AnimatedRemovalItemProps): React.JSX.Element {
  return (
    // Outer layer: height collapse. `overflow: hidden` is part of the exit
    // target (applied instantly at exit start), so card shadows are never
    // clipped at rest. It also clips the inner rightward slide, preventing
    // horizontal overflow of the scroll container.
    <m.div
      className={className}
      exit={{
        overflow: "hidden",
        height: 0,
        marginBottom: -gapPx,
        transition: {
          height: COLLAPSE_TRANSITION,
          marginBottom: COLLAPSE_TRANSITION,
        },
      }}
    >
      {/* Inner layer: the visible slide-out. Both layers receive the exit via
       * presence propagation; AnimatePresence waits for the longer one. */}
      <m.div
        exit={{
          x: "100%",
          opacity: 0,
          transition: { x: SLIDE_TRANSITION, opacity: SLIDE_TRANSITION },
        }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
