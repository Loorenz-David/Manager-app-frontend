/** Kit gesture contract (see master "Division of labor"): components report raw
 * pointer geometry; time conversion/clamping lives in the logic layer's pure
 * geometry module, which feeds updated fractions/labels back down as props. */

export type TimelineBarGestureKind = "move" | "resize-start" | "resize-end";

export type TimelineBarGesture = {
  kind: TimelineBarGestureKind;
  /** Horizontal pointer delta since gesture start, px. */
  deltaPx: number;
  /** The bar's lane width at gesture start, px — the px↔time scale reference. */
  laneWidthPx: number;
};

export const TIMELINE_LABEL_GUTTER_PX = 120;
