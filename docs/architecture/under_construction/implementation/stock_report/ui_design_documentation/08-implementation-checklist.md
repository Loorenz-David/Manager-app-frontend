# 08 — Implementation Checklist & Open Decisions

A **visual and interaction acceptance checklist**. It is not an engineering or API checklist: how the
interface is built, wired and stored is the implementation agent's call.

---

## Stock need list — controls

- [ ] Priority segmented control is the first element on the page; no page title, no aggregate total above it
- [ ] Four equal-width pills in order: Unset, High, Medium, Low, on a grey rounded track
- [ ] Selecting High / Medium / Low gives that pill a white fill and soft shadow
- [ ] `Unset` renders with **no** active fill even when it is the active bucket
- [ ] Exactly one bucket is visible at a time; `Unset` means "no priority assigned", not "all"
- [ ] Search row: magnifier, input, vertical rule, sort glyph, filter glyph — one line, never wrapping
- [ ] Placeholder reads `Search stock need...`
- [ ] Typing filters the list live, with no submit action
- [ ] Filter glyph supports a dark count badge at its top-right; hidden when no filters are active
- [ ] No property-chip filter row under the search field (removed by design)
- [ ] Full-bleed hairline divider separates the controls from the list

## Stock need list — cards

- [ ] Flat list, 10 px gaps, no priority group headers
- [ ] Card is two columns: fixed 72 px quantity panel + flexible body, hairline between them
- [ ] Quantity panel shows the type icon on the first row and the **required** quantity + `pc` on the second, both centred
- [ ] Type icon is an outline shape on a transparent background, differentiated per item type
- [ ] Body order: title + drag handle, property tags, fulfilment bar — nothing else
- [ ] No priority label, item-type word, "remaining" label or per-card action buttons on the card
- [ ] Property tags wrap and use the small grey tag style
- [ ] Fulfilment bar shows fulfilled (blue), in progress (amber) and remaining (grey) with the number **inside** each segment and no text labels
- [ ] A zero-value segment renders nothing and takes no width
- [ ] Remaining = required − fulfilled − in progress, floored at 0
- [ ] Coloured segments keep a minimum width so single digits stay legible
- [ ] The grey remaining segment always retains enough width to show its number, even when fulfilled + in progress nearly equal required
- [ ] Drag reorder works within the visible priority bucket; cross-priority moves are ignored
- [ ] Dragging card shows accent border + reduced opacity; accent also applies to its type icon
- [ ] List reflows live during the drag (no drop-indicator line)
- [ ] Tapping a card opens the stock need detail
- [ ] Empty state: centred `No stock need matches these filters.` with the controls still visible

## Stock need detail — header

- [ ] Back button (34×34, white, bordered, chevron-left) then the page title on one row
- [ ] Page title is the furniture type
- [ ] Summary card mirrors the list card anatomy at header scale: 82 px quantity panel + body
- [ ] Summary card does **not** repeat the furniture type as a card title
- [ ] Summary body order: property tags, fulfilment bar (22 px), legend
- [ ] Legend names Fulfilled / In progress / Remaining with matching swatches and wraps if needed
- [ ] Add-item button sits directly below the summary card, above the divider
- [ ] Add-item button is dashed, transparent, neutral ink — not a solid high-contrast CTA
- [ ] Add-item hover lightens the background and darkens the dashed border
- [ ] Whole page scrolls as one; nothing sticky, no pinned footer

## Stock need detail — selected items

- [ ] Section header: `Selected items` left, item count right, singular/plural correct
- [ ] Item cards match the existing Manager task-card pattern: fixed 132 px photo column + body
- [ ] Quantity badge (`#4` form) is anchored bottom-right **over** the photo
- [ ] Missing photo shows the neutral placeholder field with a centred image glyph
- [ ] Header row: item code (largest text), status pill, ⋮ overflow menu
- [ ] Source row: wrench glyph + source text, truncating with an ellipsis on one line
- [ ] Date row: calendar glyph + `DD-MM-YYYY` + optional solid red due badge
- [ ] Due badge is omitted entirely when there is no date emphasis
- [ ] Status pill uses bordered tinted styling; unknown statuses fall back to the neutral variant
- [ ] Item cards have no border and a slightly stronger shadow than the need cards
- [ ] Item cards never compress below their content height
- [ ] Empty state: centred `No items selected for this stock need yet.`, with the summary and Add-item button still visible

## Visual system

- [ ] Type hierarchy preserved: quantity numerals and item code loudest, then titles, then metadata, then units/legend/bar numbers
- [ ] Only three semantic hues in use: blue (fulfilled/active), amber (in progress), red (date urgency); grey = not yet
- [ ] Radii preserved per element (999 pills · 18 summary · 16 cards · 14 toolbar/button · 10 back · 8 due badge · 6 bar/tag)
- [ ] 16 px page gutters everywhere; 10 px between list items
- [ ] Bordered-card vs shadow-only-card distinction kept between need cards and task cards
- [ ] Manager tokens substituted for the mockup's local colour/type values where equivalents exist
- [ ] CSS-drawn furniture icons replaced with real icons at the same size, weight and colour

---

## Design Ambiguities / Open Decisions

### 1. Tap-to-open vs press-to-drag on a stock need card

1. **Shown:** the whole card is draggable and carries a `grab` cursor; the brief says tapping a card opens the detail.
2. **Unclear:** how a tap and a drag are distinguished, and whether dragging should be restricted to the ≡ handle.
3. **Safe to preserve?** No — as mocked, the two gestures compete, and on touch there is no designed long-press threshold.
4. **Decision required:** product/design. Recommended: drag from the handle only, tap anywhere else opens the detail.

### 2. Sort and filter controls have no designed surface

1. **Shown:** two glyphs in the search row, plus the styling for an active-filter count badge.
2. **Unclear:** what sort options exist, what the filter panel contains (the removed chip row suggests wood type and shape), and whether they are a sheet, a menu or a page.
3. **Safe to preserve?** The glyphs can ship inert, but shipping non-functional controls is a product call.
4. **Decision required:** yes — both the option sets and the surface type.

### 3. "Unset" bucket semantics

1. **Shown:** four pills where `Unset` shows needs with no priority and renders as unselected.
2. **Unclear:** whether users also need an "All priorities" view, and whether priority can be *assigned* from this screen (nothing in the design does so).
3. **Safe to preserve?** Yes, visually.
4. **Decision required:** product — is there a way to set priority, and is an All view needed?

### 4. Persistence and scope of manual order

1. **Shown:** drag reordering inside a priority bucket.
2. **Unclear:** whether the order is per user or global, and whether it survives navigation and reload.
3. **Safe to preserve?** Visually yes; the behavior needs wiring.
4. **Decision required:** product/engineering, outside the design.

### 5. Add-item destination

1. **Shown:** a dashed full-width "Add item" button.
2. **Unclear:** what it opens — an item picker, a create-task flow, a search sheet — and what feedback follows.
3. **Safe to preserve?** The button, yes. The flow does not exist.
4. **Decision required:** yes, a design is needed for the picker.

### 6. Item overflow menu contents

1. **Shown:** a ⋮ glyph on each item card.
2. **Unclear:** its actions.
3. **Safe to preserve?** Yes, if it reuses the existing task-card menu from Manager.
4. **Decision required:** confirm the existing menu is the right one; otherwise it needs design.

### 7. Item status vocabulary

1. **Shown:** `Working` (from the reference screenshot), plus `Assigned` and `Pending` added for variety, and a neutral fallback for anything else.
2. **Unclear:** the real status set and its colour mapping.
3. **Safe to preserve?** The **styling recipe** yes; the specific labels no.
4. **Decision required:** adopt the existing task-status vocabulary from Manager.

### 8. Is an item card tappable?

1. **Shown:** a card with no hover, pressed or selected state, and no chevron.
2. **Unclear:** whether tapping the card opens the item/task.
3. **Safe to preserve?** As read-only, yes.
4. **Decision required:** product — and if tappable, a pressed state is needed.

### 9. Over-fulfilment

1. **Shown:** a bar that clamps at 100%.
2. **Unclear:** how fulfilled > required should read (badge? overflow marker? a fourth colour?).
3. **Safe to preserve?** Only if over-fulfilment cannot occur.
4. **Decision required:** product; if it can occur, the state needs design.

### 10. Completed needs in the list

1. **Shown:** no distinct treatment — a fully fulfilled need looks like any other card with an all-blue bar.
2. **Unclear:** whether completed needs stay in the list, get a visual marker, or are filtered out.
3. **Safe to preserve?** Yes, but it is likely a gap.
4. **Decision required:** product.

### 11. Focus, keyboard and accessibility

1. **Shown:** `outline: none` on the search input; no focus states anywhere; icon-only controls without visible labels; drag-and-drop with no keyboard equivalent.
2. **Unclear:** the whole accessible layer.
3. **Safe to preserve?** No.
4. **Decision required:** the implementation agent should apply Manager's existing focus-visible and labelling conventions, and provide a keyboard path for reordering.

### 12. Loading and error states

1. **Shown:** nothing.
2. **Unclear:** skeleton vs spinner, and error presentation.
3. **Safe to preserve?** N/A.
4. **Decision required:** reuse Manager's existing loading/error patterns; a card-shaped skeleton is the coherent choice for both lists.

### 13. Sticky headers on long lists

1. **Shown:** everything scrolls, on both screens.
2. **Unclear:** whether the priority bar and search row should stick once the list is long.
3. **Safe to preserve?** Yes — the current behavior is deliberate.
4. **Decision required:** optional product improvement, not a defect.

### 14. Terminology: "stock need" vs "stock request"

1. **Shown:** UI copy says "stock need"; the feature is called Stock Request.
2. **Unclear:** which term users should see.
3. **Safe to preserve?** Yes, but it should be settled before release.
4. **Decision required:** product/content.

### 15. Desktop and tablet

1. **Shown:** a single 430 px mobile composition.
2. **Unclear:** everything above phone width.
3. **Safe to preserve?** Only inside a mobile or mobile-width context.
4. **Decision required:** yes, if Manager renders this on desktop — see `06-responsive-behavior.md`.
