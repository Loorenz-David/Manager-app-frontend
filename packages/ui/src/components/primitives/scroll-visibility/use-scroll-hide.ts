import type { ScrollVisibilityOptions } from "./scroll-visibility.types";
import { useScrollVisibility } from "./use-scroll-visibility";

type UseScrollHideOptions = Pick<
  ScrollVisibilityOptions,
  "revealAtEdge" | "edgeOffset"
>;

/**
 * Standard relative-mode scroll hide hook.
 * Use this everywhere a component should hide on scroll-down and reveal on scroll-up.
 * Changing the thresholds here changes the feel for all consumers at once.
 */
export function useScrollHide(options: UseScrollHideOptions = {}) {
  return useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
    ...options,
  });
}
