export type ScrollVisibilityOptions = {
  threshold?: number;
  /**
   * Absolute mode only: shifts the anchor point so that "top" is evaluated at this
   * scroll position rather than 0. Useful when a fixed/absolute header reserves space
   * and the logical content start is at a known offset (e.g. `topOffset: 56` means
   * "hide after threshold px past 56, show when back within hysteresis of 56").
   * Defaults to 0. Has no effect in relative mode.
   */
  topOffset?: number;
  /**
   * Relative mode only: distance required in the hide direction before hiding.
   * Falls back to `threshold` when omitted.
   */
  hideThreshold?: number;
  /**
   * Relative mode only: distance required in the show direction before showing.
   * Falls back to `threshold` when omitted.
   */
  showThreshold?: number;
  hysteresis?: number;
  /**
   * When true, measures distance from the bottom instead of scrollTop.
   * Use for bottom-anchored scrollers (e.g. chat lists) where 0 means "at the bottom".
   */
  inverted?: boolean;
  /**
   * "absolute" (default) — hides once scroll position exceeds threshold from the anchor edge;
   *   shows only when position returns within hysteresis of the anchor edge.
   *
   * "relative" — hides after scrolling threshold px in the hide direction from wherever
   *   the user last reversed; shows after scrolling threshold px back. Never requires
   *   returning to the top/bottom edge.
   *
   * Composes independently with `inverted`:
   *   mode "absolute", inverted false  → hide when far from top,    show near top
   *   mode "absolute", inverted true   → hide when far from bottom,  show near bottom
   *   mode "relative", inverted false  → hide on scroll-down, show on scroll-up
   *   mode "relative", inverted true   → hide on scroll-up,  show on scroll-down
   */
  mode?: "absolute" | "relative";
};

export type ScrollVisibilityContextValue = {
  isHidden: boolean;
  reset(): void;
  suspend(durationMs?: number): void;
};
