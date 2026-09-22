/**
 * The bar's three meaning-carrying colours, in one place.
 *
 * **Owner revision, 2026-09-22.** The first pass followed the mockup's hue
 * assignment — a deep blue for fulfilled and the system's amber for in
 * progress. On a device the blue read too dark and the amber read as an alarm,
 * which is wrong for work that is simply under way. The hues are now:
 *
 *   - **fulfilled → light green.** Done is done; green says so without shouting.
 *   - **in progress → light blue.** Active, calm, and plainly not a warning.
 *   - **in queue → light amber.** Owner, 2026-09-22: queued work was being
 *     folded into in progress, which overstated how much was actually moving.
 *     Amber reads as "waiting its turn" without reading as a fault.
 *   - **remaining → grey.** Unchanged: grey is always "not yet".
 *
 * The fills take their hues from `@beyo/ui`'s `StatePill` variants so the
 * feature stays inside the app's palette, darkened to carry a white numeral —
 * see `SEGMENT_FILL_CLASS` for the contrast ceiling that sets how dark.
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
 * the contrast target but drained the hue and read as a dark overlay. These sit
 * in the same luminance band — the white numeral needs that much — but with the
 * chroma pushed up instead of the lightness pulled down.
 *
 * The limit is legibility, and with a white numeral it works the opposite way
 * round from a dark one: white needs the fill to be **dark enough**. At 11 px
 * bold the number counts as ordinary text, so it needs 4.5:1, which puts a
 * *ceiling* on the fill's relative luminance of about **0.18**:
 *
 *   - `fulfilled`  `#1a8048` — 5.0:1 with white
 *   - `inProgress` `#1b6ec2` — 5.2:1
 *   - `inQueue`    `#d99e0b` — 2.4:1 with white, **below AA by the owner's
 *     decision, 2026-09-22**: the amber was wanted bright and the numeral
 *     white, and the two cannot both hold. Raised twice with the numbers; this
 *     is the trade the owner chose, not an oversight. Darkening this fill is
 *     what buys the contrast back.
 *
 * Saturating further is mostly free; lightening is not. Green and amber are the
 * ones to watch — green weighs heaviest in the luminance formula, and amber is
 * bright by nature, so both run out of contrast well before blue does.
 *
 * Amber is the awkward one, and it is worth knowing why. Its *hue* wants to sit
 * near 45°, where there is real yellow in it; drift down toward 35° and it
 * reads orange, almost red. But holding 45° while staying dark enough for a
 * white numeral forces it toward mustard — the darker an amber gets, the more
 * it browns. Owner, 2026-09-22: the colour won twice over, so `inQueue` is a
 * genuinely bright amber *and* keeps a white numeral, at the cost of that
 * numeral's contrast. Green and blue have room to move; amber does not.
 */
export const SEGMENT_FILL_CLASS = {
  fulfilled: "bg-[#1a8048]",
  inProgress: "bg-[#1b6ec2]",
  inQueue: "bg-[#d99e0b]",
} as const;

export const SEGMENT_INK_CLASS = {
  fulfilled: "text-white",
  inProgress: "text-white",
  inQueue: "text-white",
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
 * row is waiting on, which is the same idea the bar's in-queue segment carries
 * — decorative here, so it is the only place this colour is not a data value.
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
