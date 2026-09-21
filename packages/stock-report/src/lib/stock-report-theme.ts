/**
 * The feature's three meaning-carrying colours, in one place.
 *
 * Only three hues carry meaning on these screens (`07-visual-system.md`):
 * blue = fulfilled / active, amber = in progress, grey = not yet. The mockup
 * was drawn without the Manager design system, so its literals are mapped onto
 * this repo's values rather than copied:
 *
 * | Mockup     | Ships as                      | Why                                  |
 * |------------|-------------------------------|--------------------------------------|
 * | `#2f6ee0`  | `#1f5ea8`                     | `@beyo/styles` has no blue accent —   |
 * |            |                               | `--color-primary` is `#303030`. This  |
 * |            |                               | is the blue `StatePill`'s `active`    |
 * |            |                               | variant already uses (owner, 2026-09-21). |
 * | `#b5801f`  | `var(--color-warning)`        | the system's warning/in-progress token |
 * | `#ededee`  | `var(--color-light-border)`   | the system's lightest surface line    |
 *
 * Complete class strings, never assembled — Tailwind's scanner reads this file
 * (it is registered with `@source`) and would miss anything interpolated.
 */

export const FULFILLED_SEGMENT_CLASS = "bg-[#1f5ea8] text-white";
export const IN_PROGRESS_SEGMENT_CLASS = "bg-warning text-white";
export const BAR_TRACK_CLASS = "bg-light-border";
export const REMAINING_TEXT_CLASS = "text-muted-foreground";

/** Applied to a card and its picture frame while that card is being dragged. */
export const DRAG_ACCENT_BORDER_CLASS = "border-[#1f5ea8]";

/** Legend swatches — same three values, as 8 px squares. */
export const LEGEND_SWATCH_CLASS = {
  fulfilled: "bg-[#1f5ea8]",
  inProgress: "bg-warning",
  remaining: "bg-muted",
} as const;
