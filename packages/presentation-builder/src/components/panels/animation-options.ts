/** Shared appear/disappear choices for timed elements (text AND media panels).
 * Wire mapping (editor "slide" → `fade_up`, 450 ms) lives in composition-mapping. */
export type AnimationChoice = "fade" | "slide" | "none";

export const ANIMATION_OPTIONS = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "none", label: "None" },
] as const;
