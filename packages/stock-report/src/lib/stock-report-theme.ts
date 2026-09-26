/**
 * The bar's four meaning-carrying colours, in one place.
 *
 * **Owner revision, 2026-09-22.** The first pass followed the mockup's hue
 * assignment — a deep blue for fulfilled and the system's amber for in
 * progress. On a device the blue read too dark and the amber read as an alarm,
 * which is wrong for work that is simply under way.
 *
 * **Owner revision, 2026-09-26.** The snapshot layer added `quantity_missing`
 * — units the buyer still has to find — and that *is* an alarm, so the bright
 * amber moved from the queue to the new missing segment. The queue originally
 * took a teal, but that read too much like a positive/confirmed state for work
 * that has not started. It is now neutral grey. The hues are:
 *
 *   - **fulfilled → bright green.** Done is done; the lighter, cleaner green
 *     reads as accomplished without looking muddy.
 *   - **in progress → blue.** Active, calm, and plainly not a warning.
 *   - **in queue → grey.** Allocated but static: distinct from both the blue
 *     active state and the green accomplished state.
 *   - **missing → amber.** A warning to the manager: this much cannot be
 *     covered from stock and someone has to go and find it.
 *   - **remaining → grey.** Unchanged: grey is always "not yet".
 *
 * The fills stay inside the app's palette where one exists (the amber trio is
 * `@beyo/ui`'s `StatePill` warning), and all carry a white numeral.
 *
 * Complete class strings, never assembled — Tailwind's scanner reads this file
 * (it is registered with `@source`) and would miss anything interpolated.
 */

/**
 * The fill behind each coloured segment, and its legend swatch.
 *
 * **Tune the intensity here.** Saturated mid-tones, not tinted or shaded ones:
 * the colour is carried by chroma rather than by darkness (owner, 2026-09-22).
 * An earlier pass darkened the pastels by mixing them toward grey, which hit
 * the contrast target but drained the hue and read as a dark overlay. The
 * darker segments sit in the same luminance band. Fulfilled and missing are
 * deliberately brighter exceptions so their hues stay clean rather than muddy.
 *
 * The limit is legibility, and with a white numeral it works the opposite way
 * round from a dark one: white needs the fill to be **dark enough**. At 11 px
 * bold the number counts as ordinary text, so it needs 4.5:1, which puts a
 * *ceiling* on the fill's relative luminance of about **0.18**:
 *
 *   - `fulfilled`  `#16a34a` — 3.3:1 with white, **below AA by the owner's
 *     decision, 2026-09-26**: the brighter green and white numeral are kept
 *     together for visual consistency with the other segments.
 *   - `inProgress` `#1b6ec2` — 5.2:1
 *   - `inQueue`    `#6b7280` — 4.8:1; neutral grey, because queued is static
 *   - `missing`    `#d99e0b` — 2.4:1 with white, **below AA by the owner's
 *     decision, 2026-09-22** (it was the queue's amber then): the amber was
 *     wanted bright and the numeral white, and the two cannot both hold.
 *     Raised twice with the numbers; this is the trade the owner chose, not an
 *     oversight. Darkening this fill is what buys the contrast back.
 *
 * Saturating further is mostly free; lightening a white-ink segment is not.
 * Amber is the one to watch: it is bright by nature and runs out of contrast
 * well before blue does.
 *
 * Amber is the awkward one, and it is worth knowing why. Its *hue* wants to sit
 * near 45°, where there is real yellow in it; drift down toward 35° and it
 * reads orange, almost red. But holding 45° while staying dark enough for a
 * white numeral forces it toward mustard — the darker an amber gets, the more
 * it browns. The owner chose the colour over the contrast, twice.
 */
export const SEGMENT_FILL_CLASS = {
  fulfilled: "bg-[#16a34a]",
  inProgress: "bg-[#1b6ec2]",
  inQueue: "bg-[#6b7280]",
  missing: "bg-[#d99e0b]",
} as const;

export const SEGMENT_INK_CLASS = {
  fulfilled: "text-white",
  inProgress: "text-white",
  inQueue: "text-white",
  missing: "text-white",
  remaining: "text-muted-foreground",
} as const;

export const BAR_TRACK_CLASS = "bg-light-border";

/**
 * Applied to a card while it is being dragged.
 *
 * The app's neutral emphasis, not a hue: with blue now meaning "in progress",
 * a blue drag border would read as a bar colour that had escaped the bar.
 *
 * It no longer reaches the category picture. Design state B2 turned the type
 * icon's *stroke* accent too, which was only possible while the icon was
 * CSS-drawn; the picture is a real transparent-background image with no frame
 * of its own (owner, 2026-09-22), so the card's border and opacity carry the
 * dragging look alone.
 */
export const DRAG_ACCENT_BORDER_CLASS = "border-primary";

/**
 * The diamond on the priority button. Amber because priority is the thing the
 * row is waiting on — decorative here, so it is the only place this hue is not
 * a data value (the bar's amber means "missing").
 */
export const PRIORITY_ACTION_MARKER_CLASS = "bg-[#f0c36a]";

/**
 * Legend swatches — the segment fills themselves, as 8 px squares, so the
 * legend cannot drift from the bar it explains.
 */
export const LEGEND_SWATCH_CLASS = {
  ...SEGMENT_FILL_CLASS,
  remaining: "bg-muted",
} as const;

/**
 * The banner at the top of the match warning — icon, headline and the
 * stored-item note on a light amber field (owner, 2026-09-22).
 *
 * The trio is `@beyo/ui`'s `StatePill` `warning` variant, taken whole rather
 * than mixed fresh: `#fff4d6` behind `#8a5a00` ink inside a `#f0c36a` border.
 * That ink is `--color-warning` itself, so `text-warning` carries it and the
 * icon inherits it as `currentColor` — one colour to change, not three. It
 * reaches 5.4:1 on the fill, comfortably past AA at this size.
 *
 * Amber and not red on purpose: a mismatch here is overridable. The blocked
 * view keeps its destructive red, because that one has no way through.
 */
export const MATCH_WARNING_BANNER_CLASS =
  "border-[#f0c36a] bg-[#fff4d6] text-warning";
