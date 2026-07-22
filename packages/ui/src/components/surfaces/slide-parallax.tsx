import { useEffect, useRef, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { cn } from "@beyo/lib";

/** Fraction of the panel width the layer beneath a slide parks at (iOS-style
 * stack parallax): fully covered → shifted left by this fraction; glides back
 * to 0 in lockstep as the slide above leaves. */
export const SLIDE_PARALLAX_FRACTION = 0.25;

export type SlidePanelEntry = {
  /** Stack position of the slide (higher = closer to the viewer). */
  order: number;
  /** The slide's live horizontal offset in px (0 = covering, width = gone). */
  x: MotionValue<number>;
  /** Live width of the sliding panel, for normalizing `x` into progress. */
  getWidth: () => number;
};

// Module-scoped registry of currently-mounted slide panels. Entries live for
// the panel's full mount lifecycle — including its exit animation — which is
// exactly the window during which layers beneath must keep deriving their
// parallax shift from it.
const panelEntries = new Set<SlidePanelEntry>();
const registryListeners = new Set<() => void>();

function notifyRegistry(): void {
  registryListeners.forEach((listener) => listener());
}

export function registerSlidePanel(entry: SlidePanelEntry): () => void {
  panelEntries.add(entry);
  notifyRegistry();
  return () => {
    panelEntries.delete(entry);
    notifyRegistry();
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Live parallax shift (px, ≤ 0) for a layer sitting at `order` in the surface
 * stack: `-FRACTION × width × coverage`, where coverage is how much the most
 * covering slide above is currently over this layer (1 at rest, 0 once slid
 * away). Pure derivation of the slides' `x` MotionValues — enter, drag,
 * spring-back and exit all flow through with no separate choreography.
 * Taking the max over all slides above (not just the nearest) keeps overlap
 * windows — one slide exiting while another enters — continuous.
 */
export function useSlideParallaxShift(
  order: number,
  getWidth: () => number,
): MotionValue<number> {
  const shift = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const getWidthRef = useRef(getWidth);
  getWidthRef.current = getWidth;

  useEffect(() => {
    if (prefersReducedMotion) {
      shift.set(0);
      return;
    }

    let valueUnsubs: Array<() => void> = [];

    const attach = () => {
      valueUnsubs.forEach((unsub) => unsub());
      const above = [...panelEntries].filter((entry) => entry.order > order);

      const recompute = () => {
        let maxCoverage = 0;
        for (const entry of above) {
          const width = entry.getWidth();
          if (width <= 0) continue;
          const coverage = 1 - clamp01(entry.x.get() / width);
          if (coverage > maxCoverage) maxCoverage = coverage;
        }
        const magnitude =
          SLIDE_PARALLAX_FRACTION * getWidthRef.current() * maxCoverage;
        shift.set(magnitude === 0 ? 0 : -magnitude);
      };

      valueUnsubs = above.map((entry) => entry.x.on("change", recompute));
      recompute();
    };

    attach();
    registryListeners.add(attach);
    return () => {
      registryListeners.delete(attach);
      valueUnsubs.forEach((unsub) => unsub());
    };
  }, [order, prefersReducedMotion, shift]);

  return shift;
}

type SlideParallaxUnderlayProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wrap an app's entire base screen — tab content AND shell chrome (tab bar,
 * floating cards) — so it takes part in the slide stack parallax as one unit:
 * it parks slightly left while any slide page covers it and glides back as
 * the last slide leaves — driven frame-by-frame by the slides' live positions
 * (drag included). One wrapper per app shell; slides covering other slides
 * need nothing. Note: this element is transformed, so `fixed` descendants
 * anchor to its box (which matches the shell frame) rather than the viewport.
 */
export function SlideParallaxUnderlay({
  children,
  className,
}: SlideParallaxUnderlayProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const shift = useSlideParallaxShift(-1, () =>
    ref.current ? ref.current.offsetWidth : window.innerWidth,
  );

  return (
    <m.div
      ref={ref}
      className={cn(
        "relative h-full w-full transform-gpu will-change-transform",
        className,
      )}
      style={{ x: shift }}
    >
      {children}
    </m.div>
  );
}
