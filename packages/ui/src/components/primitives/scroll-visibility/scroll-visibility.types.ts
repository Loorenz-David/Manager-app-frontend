export type ScrollVisibilityOptions = {
  threshold?: number;
  hysteresis?: number;
  /**
   * When true, measures distance from the bottom instead of scrollTop.
   * Use for bottom-anchored scrollers (e.g. chat lists) where 0 means "at the bottom".
   */
  inverted?: boolean;
};

export type ScrollVisibilityContextValue = {
  isHidden: boolean;
  reset(): void;
  suspend(durationMs?: number): void;
};
