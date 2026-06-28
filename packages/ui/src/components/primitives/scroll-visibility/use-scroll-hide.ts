import { useScrollVisibility } from "./use-scroll-visibility";

/**
 * Standard relative-mode scroll hide hook.
 * Use this everywhere a component should hide on scroll-down and reveal on scroll-up.
 * Changing the thresholds here changes the feel for all consumers at once.
 */
export function useScrollHide() {
  return useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
  });
}
