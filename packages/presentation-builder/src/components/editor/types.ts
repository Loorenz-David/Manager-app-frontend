import type { ReactNode } from "react";

/** Kit gesture contract (same rule as the timeline bars): the canvas box reports
 * raw pointer deltas as canvas fractions; aspect locking, minimum size, and
 * clamping live in the logic layer's pure geometry module. */
export type CanvasResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type CanvasResizeGesture = {
  handle: CanvasResizeHandle;
  /** Horizontal pointer delta since gesture start, as a fraction of canvas width (unclamped). */
  deltaXFraction: number;
  /** Vertical pointer delta since gesture start, as a fraction of canvas height (unclamped). */
  deltaYFraction: number;
};

/** Everything a slide-rail card renders. Derivation (labels, counts, thumbnails) is controller-side. */
export type SlideRailItemData = {
  id: string;
  /** Mono label inside the thumbnail when no thumbnail node is supplied. */
  mediaLabel: "IMAGE" | "VIDEO" | null;
  /** Preformatted, e.g. "2 texts". */
  textCountLabel: string;
  /** Rendered miniature (runtime renderer at t=0); stripe placeholder when absent. */
  thumbnail?: ReactNode;
};
