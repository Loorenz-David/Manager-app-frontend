# 04 — Interactions

Format: **user action → visible UI response → resulting UI state**.

---

## List screen

### 1. Select a priority

```
Tap "High" / "Medium" / "Low"
  ↓
That pill fills white with a soft shadow; the previously selected pill returns to transparent.
The card list is replaced by the needs of that priority only.
  ↓
List shows one bucket. Search query and manual order persist.
```

### 2. Return to Unset

```
Tap "Unset"
  ↓
All pills render unselected (Unset never shows the white active fill — by design).
The list shows needs whose priority is not assigned.
  ↓
Resting state of the screen.
```

Note the semantics: `Unset` is **not** "all". It is the bucket of needs without a priority. The list only
ever shows one bucket.

### 3. Search

```
Type in the search field
  ↓
List filters live on every keystroke — no submit, no spinner in the mockup.
  ↓
Filtered list, or the "No stock need matches these filters." empty state.
```

Clearing the field restores the bucket. No clear (×) button is designed.

### 4. Sort control

```
Tap the sort glyph
  ↓
(no designed response)
```

This action is expected to trigger application behavior. The surface it opens is not designed; the
implementation agent should connect it to existing machinery once the sort options are defined.

### 5. Filter control

```
Tap the filter glyph
  ↓
(no designed response)
```

Same as sort. The design does provide the **result** styling: when filters are active, a dark count badge
appears over the glyph's top-right corner. An earlier iteration had a dashed property-chip row
(wood type / shape) under the search field; it was removed, and those filters are expected to live behind
this control instead.

### 6. Reorder within a priority

```
Press and drag a card (whole card is draggable; ≡ is the affordance)
  ↓
The dragged card takes an accent border (#2f6ee0) and drops to opacity .65; its type icon turns accent too.
As the pointer passes over another card, the dragged card is inserted at that card's position immediately —
the list reflows live, no gap placeholder or drop indicator is drawn.
  ↓
Release: the card returns to full opacity and default border, in its new position.
```

Constraint that is part of the design: **a card can only be reordered among cards of the same priority.**
A drag that would cross priorities is ignored (no visual rejection cue is designed). Since the list shows
one priority at a time, this is normally invisible to the user.

Persistence of the manual order is application behavior; the implementation agent should connect it to the
existing machinery.

### 7. Open a need

```
Tap a stock-need card
  ↓
Navigate to the stock need detail screen for that need.
  ↓
Detail screen, titled with the need's furniture type.
```

No pressed/hover state is designed for this tap, and the mockup's cards carry `cursor: grab` (drag
affordance) rather than `pointer`. Reconciling tap-to-open with press-to-drag is an open decision — see
ambiguities.

---

## Detail screen

### 8. Back

```
Tap the ← button
  ↓
Return to the stock need list.
  ↓
List screen. Whether filter/query/order are restored is unspecified.
```

### 9. Add item

```
Tap "+ Add item"
  ↓
Hover state (background #eceef2, border #98a6bd) on pointer devices; on tap, no designed response.
  ↓
Expected: an item picker / selection surface opens, and on confirmation the new item appears in the
"Selected items" list, the count in the section header increases, and the fulfilment bar in the summary
recalculates.
```

The picker itself is **not designed**. This action is expected to trigger application behavior; the
implementation agent should connect it to the existing domain/API machinery.

### 10. Item overflow menu

```
Tap ⋮ on an item card
  ↓
(no designed response)
```

The menu's items are not designed. Expected to expose per-item actions consistent with the existing task
card elsewhere in Manager; reuse that menu rather than inventing one.

### 11. Scrolling

The detail page scrolls as a single document: header bar, summary card, Add-item button, divider, section
header and the item list all scroll together. Nothing is sticky. This replaced an earlier bottom-pinned
CTA and is intentional — the item list is meant to get the maximum share of the screen.

---

## Interactions explicitly *not* present

- No swipe actions on cards.
- No inline quantity editing.
- No priority change from the card.
- No multi-select or bulk actions.
- No pull-to-refresh, no pagination control, no infinite-scroll affordance.
- No toasts, dialogs or confirmations.
