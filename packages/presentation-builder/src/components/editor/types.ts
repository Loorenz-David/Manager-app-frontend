import type { ReactNode } from "react";

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
