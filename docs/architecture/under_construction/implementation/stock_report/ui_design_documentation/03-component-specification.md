# 03 — Component Specification

Values quoted are those present in the mockup. Where a value is not established, the relationship is
described instead.

---

## PriorityFilterBar

**Purpose.** Selects which priority bucket the list shows. It is the *only* place priority appears, so it
doubles as the list's grouping mechanism.

**Anatomy.** A rounded track (`#e3e3e5`, radius 999, padding 4, gap 2) containing four equal-width pills.

**Content.** `Unset` · `High` · `Medium` · `Low`, in that order. Labels are single words; 15 px / 600.

**Variants.** None beyond state.

**States.**

| State | Appearance |
|-------|-----------|
| Selected (High / Medium / Low) | White fill, `color #1c1c1e`, `box-shadow 0 1px 3px rgba(0,0,0,.12)` |
| Unselected | Transparent fill, `color #5a5a60` |
| `Unset` selected | **Renders as unselected** — transparent, no white fill. Unset is the "no priority chosen" resting state and must not look like an active selection, even though it is the active tab. |

**User actions.** Tap a pill → that bucket becomes the visible list. Exactly one pill is active at a time.

**Visual relationships.** Topmost element of the page; sits above the search toolbar with a 14 px gap.

---

## SearchToolbar

**Purpose.** Narrow the list by free text; host the sort and filter affordances.

**Anatomy.** One white rounded row: search glyph · text input · 1×22 px vertical rule · sort glyph ·
filter glyph (with optional count badge).

**Content.** Placeholder `Search stock need...`. Input text 16 px / 400, `#1c1c1e`.

**States.**

| State | Appearance |
|-------|-----------|
| Empty | Placeholder visible |
| Typed | Value replaces placeholder; list filters live (no submit) |
| Filter active | Dark pill badge (`#1c1c1e`, white 12 px/600 text, min-width 20, height 20) overlapping the filter glyph's top-right |
| Filter inactive | No badge |

**User actions.** Type to filter. Tap sort glyph. Tap filter glyph.
Sort and filter are **visual affordances only** in the mockup — no menu, sheet or panel is designed for
them, and the badge is never populated. This action is expected to trigger application behavior; the
implementation agent should connect it to the existing machinery, or the surfaces must be designed first.

**Search matching in the mockup** (documented as design intent, not as an algorithm mandate): the query
matches against the need title, its property values and its item type, case-insensitively, as a substring.

---

## StockNeedCard

**Purpose.** Communicate one stock need: the goal quantity, what it is, and how close it is.

**Anatomy.** Two columns inside a white rounded card:

```
┌────────┬──────────────────────────────────────────┐
│  icon  │ Title                            ≡ handle│
│ ────── │ [tag] [tag]                              │
│ 30  pc │ ▓fulfilled▓ ▓progress▓ ░remaining░       │
└────────┴──────────────────────────────────────────┘
   72px                  flex: 1
```

**Content.**
- Type icon — geometric outline, transparent background, 2 px stroke `#5f5f66`, 30×30 box, shape varies
  per item type (see *TypeIcon*).
- Required quantity — 24 px / 700, `letter-spacing -.6px`, `#1c1c1e`; unit label `pc` 11 px / 600,
  `#8e8e94`.
- Title — 16 px / 700, `#1c1c1e`, `letter-spacing -.3px`, `line-height 1.2`.
- Property tags — 12 px / 500, `#6b6b70` on `#f4f4f5`, radius 6, padding `3px 8px`, gap 6, wraps.
- Fulfilment bar — see *FulfilmentBar*.
- Drag handle — two-line glyph, 18×18, `#c2c2c7`, `cursor: grab`.

**Variants.** None; the card is identical across priorities and item types except for the type icon.

**States.**

| State | Appearance |
|-------|-----------|
| Default | `1px solid #e6e6e8`, `box-shadow 0 1px 2px rgba(0,0,0,.05)`, opacity 1 |
| Dragging | Border `#2f6ee0` (accent), `opacity .65`; the type icon's stroke also becomes `#2f6ee0` |
| Hover | Not defined in the mockup — cursor is `grab` across the whole card |
| Completed (remaining = 0) | Inferred — see `05-ui-states.md` |

**User actions.** Drag (whole card is draggable; handle is the visual affordance). Tap to open detail
(navigation target implied by the feature brief; no pressed state designed).

---

## QuantityPanel

**Purpose.** Anchor the card's identity (item type) and its goal number in one fixed-width block.

**Anatomy.** Fixed-width left column, right border `#ededee`, two equal rows: type icon centred above,
quantity + `pc` centred below. 72 px on list cards, 82 px on the detail summary; numeral 24 px on list,
26 px on detail.

**Content.** The number shown is the **required** quantity. (During design this slot briefly showed the
remaining quantity; it was changed to required — remaining now lives in the bar.)

---

## FulfilmentBar

**Purpose.** Express required / fulfilled / in-progress / remaining in a single horizontal read, with the
numbers inside the bar rather than as separate labelled rows.

**Anatomy.** A rounded track (`background #ededee`, `border-radius 6px`, `overflow: hidden`) with up
to three segments in fixed order: **fulfilled** (blue `#2f6ee0`) → **in progress** (amber `#b5801f`) →
**remaining** (the uncovered grey track). Height 20 px on list cards, 22 px in the detail summary.

**Content.** Each segment shows its own number, no label: 11 px / 700. Fulfilled and in-progress numbers
are white on their fill; the remaining number is `#6b6b70` on grey. A segment with value 0 shows nothing
and occupies no width.

**Sizing rules present in the design (behavioural intent, preserve them).**
- Segment widths are proportional to `value / required`.
- Each non-zero fulfilled / in-progress segment has a **minimum width of 14%** so a single digit stays
  legible.
- When remaining > 0, the fulfilled + in-progress pair is constrained to a budget of **100% − 16%**,
  proportionally scaled down if the minimums would exceed it, so the grey remaining segment always keeps
  enough room to show its number.
- The remaining segment is the flexible remainder (`flex: 1 1 auto`); the two coloured segments are
  `flex: none`.
- Remaining is `max(0, required − fulfilled − in progress)`.

**States.** See `05-ui-states.md` for the full matrix (no progress / partial / all in progress /
complete / over-fulfilled).

---

## FulfilmentLegend *(detail summary only)*

**Purpose.** Name the three colours once, on the screen where the bar is the primary data display.

**Anatomy.** A wrapping row, `gap 12px`, of three entries: 8×8 swatch (`border-radius 2px`) + label.
Labels `Fulfilled` (`#2f6ee0`), `In progress` (`#b5801f`), `Remaining` (`#dcdcde` swatch).
Text 11 px / 600, `#6b6b70`, `letter-spacing .02em`.

**Visual relationship.** Directly under the bar it explains; not present on list cards, where space is
tight and the colours are learned from the detail screen.

---

## TypeIcon

**Purpose.** Signal the furniture type without a text label.

**Anatomy.** A single CSS-drawn outline box, transparent fill, 2 px border `#5f5f66` (`#2f6ee0` while
its card is dragging):

| Type | Shape |
|------|-------|
| chair | 30×30, `border-radius 3px 3px 8px 8px`, thick top border (7 px) — reads as a seat with a back |
| table | 30×28, `border-radius 2px`, thick top border (9 px), no bottom border — reads as a tabletop |
| sideboard (default) | 30×26, `border-radius 3px`, thick left border (9 px) — reads as a cabinet with a door |

**Note.** These are **design placeholders standing in for a real icon set**. The intent is a transparent,
outline, single-colour icon per item type at ~30 px. Replacing them with the Manager icon set is expected
and desirable; the sizes, stroke weight and colour should be preserved.

---

## StockNeedList / EmptyState (list screen)

Vertical flex column, `gap 10px`. When no need matches the active priority + query, the list is replaced
by a single centred message: `No stock need matches these filters.` — 14 px / 500, `#63636a`,
`padding 46px 20px`. No illustration, no reset button.

---

## DetailHeaderBar

**Purpose.** Identify the need and provide the way back.

**Anatomy.** Row: 34×34 back button (white, `1px solid #e6e6e8`, radius 10, chevron-left 20 px
`#1c1c1e`) + page title, `gap 10px`.

**Content.** Title = the furniture type, e.g. `Dining chair`. 19 px / 700, `letter-spacing -.4px`,
`#1c1c1e`. The title is exposed as a tweakable prop `pageTitle` in the mockup.

**States.** Back button hover/pressed not defined.

---

## NeedSummaryCard

**Purpose.** The detail page's header: the same anatomy as a list card, promoted to summary scale.

**Anatomy.** QuantityPanel (82 px) + body containing property tags → fulfilment bar (22 px) → legend.
Radius 18 (vs 16 on list cards), `padding 15px 16px` in the body, `gap 10px`.

**Content.** No title — the page title carries the furniture type; repeating it was explicitly removed.

**States.** Mirrors the FulfilmentBar states. No interactive states; the card is not tappable.

---

## AddItemButton

**Purpose.** The one constructive action on the detail page: attach another item to this need.

**Anatomy.** Full-width button, plus glyph (19 px, `#6b6b70`) + label `Add item`, `gap 9px`, centred.

**Appearance.** Transparent background, **dashed** `1px #b9c4d6`, `border-radius 14px`,
`padding 14px 18px`, label 16 px / 600 `#4a4a4f`.
Hover: `background #eceef2`, `border-color #98a6bd`.

**Emphasis rationale.** Deliberately low-contrast (an earlier solid-black version was rejected). It reads
as an "add a slot" affordance consistent with the dashed-chip language, not as a page-level CTA.

**Placement.** Inside the header block, directly under the summary card (`margin-top 12px`), above the
divider — so it scrolls with the page and the item list owns the rest of the screen.

**States.** Default, hover as above. Disabled / loading not designed.

---

## SectionHeader ("Selected items")

Row with `space-between`: label `Selected items` 15 px / 700 `#1c1c1e` `letter-spacing -.2px`;
count right-aligned 13 px / 500 `#5f5f66`, formatted `N items` (singular `1 item`).

---

## ItemTaskCard

**Purpose.** Show one item selected to fulfil the need, using the existing task-card pattern from the
Manager application (the pattern was supplied as a reference screenshot and must be matched).

**Anatomy.**

```
┌──────────────┬──────────────────────────────────────┐
│              │ #0000808      (Working)          ⋮   │
│    photo     │ 🔧 Internal                          │
│              │ 📅 16-09-2026  [Today]               │
│         (#4) │                                      │
└──────────────┴──────────────────────────────────────┘
     132px                    flex: 1
```

**Content.**
- **Thumbnail** — square-ish photo filling a fixed 132 px column, full card height. In the mockup it is a
  placeholder: `#e6e4e0` field with a centred 28 px image glyph (`#b0aca6`). Real item photography is
  expected.
- **Quantity badge** — `#4` style label: `rgba(28,28,30,.72)`, white 14 px / 700, radius 999,
  `padding 4px 11px`, anchored `right: 8px; bottom: 8px` over the photo. It expresses how many pieces
  this item contributes.
- **Code** — `#0000808`, 21 px / 700, `letter-spacing -.4px`, `line-height 1`, `#1c1c1e`; the
  largest text in the card, truncates before the pill does.
- **StatusPill** — see below.
- **Overflow menu** — three 4 px dots stacked vertically, `gap 3px`, `#6b6b70`, `cursor: pointer`.
- **Source row** — wrench glyph 19 px `#8a8a90` + source text 16 px / 500 `#6b6b70`, single line with
  ellipsis (e.g. `Internal`, `Vasquez workshop`).
- **Date row** — calendar glyph 19 px `#8a8a90` + date `DD-MM-YYYY` 16 px / 500 `#6b6b70`, plus an
  optional DueBadge.

**Card chrome.** White, radius 16, `box-shadow 0 1px 3px rgba(0,0,0,.08)`, **no border** (unlike stock
need cards), `min-height 132px`, never shrinks below content height.

**Variants.** By status (pill colour) and by presence/absence of a DueBadge.

**States.** Default only. Hover, pressed, selected and disabled are not defined. Whether the card itself
is tappable is unspecified — see ambiguities.

**User actions.** Tap ⋮ → per-item menu (menu contents not designed).

---

## StatusPill

**Purpose.** State of the work on that item.

**Anatomy.** Rounded pill, 15 px / 700, `letter-spacing -.1px`, `padding 5px 15px`, radius 999,
`white-space: nowrap`, 1 px border, tinted background, saturated text.

| Status | Background | Border | Text |
|--------|-----------|--------|------|
| `Working` | `#eff5ff` | `#9cc0f5` | `#2f6ee0` |
| `Assigned` | `#f3f0fb` | `#c0b3e6` | `#5b46a8` |
| Any other (e.g. `Pending`) | `#f4f4f5` | `#d8d8dc` | `#5f5f66` |

`Working` reproduces the reference screenshot exactly. `Assigned` and `Pending` follow the same
recipe and are **inferred** additions — confirm the real status vocabulary before shipping.

---

## DueBadge

**Purpose.** Flag date urgency next to the date.

**Anatomy.** Solid rectangle-ish badge, `border-radius 8px`, `padding 3px 11px`, 15 px / 700 white,
`letter-spacing -.1px`, `white-space: nowrap`.

| Label | Background |
|-------|-----------|
| `Today` | `#9d3030` |
| `Overdue` | `#7c1f1f` (darker) |
| none | badge omitted entirely |

`Today` is explicit (from the reference screenshot). `Overdue` is inferred. Any future-date badge is
undesigned.

---

## SelectedItemList / EmptyState (detail)

Vertical flex column, `gap 10px`, cards `flex: none`. Empty copy:
`No items selected for this stock need yet.` — 14 px / 500, `#63636a`, `padding 40px 20px`, centred.
The Add-item button remains visible above the divider in this state.
