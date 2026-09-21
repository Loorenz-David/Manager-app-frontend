# 07 — Visual System

Values listed here are taken from the mockup. The mockup was built **without** access to the Manager
design system, so these are self-consistent local values, **not** tokens. Where the Manager design system
has an equivalent primitive, prefer the system's value and keep the *relationships* described below.

## Typeface

**Inter Tight** (weights 400, 500, 600, 700), fallback `Helvetica Neue, Helvetica, sans-serif`,
antialiased. If Manager uses a different UI face, substitute it and keep the weight/size hierarchy.

## Type hierarchy

| Role | Size / weight | Colour | Extra |
|------|---------------|--------|-------|
| Item code (task card) | 21 / 700 | `#1c1c1e` | `letter-spacing -.4px`, `line-height 1` |
| Detail page title | 19 / 700 | `#1c1c1e` | `letter-spacing -.4px` |
| Required quantity — detail | 26 / 700 | `#1c1c1e` | `letter-spacing -.7px`, `line-height 1` |
| Required quantity — list card | 24 / 700 | `#1c1c1e` | `letter-spacing -.6px`, `line-height 1` |
| Need title (list card) | 16 / 700 | `#1c1c1e` | `letter-spacing -.3px`, `line-height 1.2` |
| Section label ("Selected items") | 15 / 700 | `#1c1c1e` | `letter-spacing -.2px` |
| Status pill / due badge | 15 / 700 | per status | `letter-spacing -.1px` |
| Priority pill | 15 / 600 | `#1c1c1e` selected, `#5a5a60` idle | |
| Item metadata (source, date) | 16 / 500 | `#6b6b70` | |
| Search input | 16 / 400 | `#1c1c1e` | |
| Add-item label | 16 / 600 | `#4a4a4f` | |
| Item count | 13 / 500 | `#5f5f66` | |
| Empty-state copy | 14 / 500 | `#63636a` | centred |
| Property tag | 12 / 500 | `#6b6b70` | |
| Filter count badge | 12 / 600 | `#fff` | |
| Bar segment numbers | 11 / 700 | `#fff` on fills, `#6b6b70` on grey | |
| Unit label ("pc") | 11 / 600 | `#8e8e94` | `letter-spacing .02em` |
| Legend labels | 11 / 600 | `#6b6b70` | `letter-spacing .02em` |

Hierarchy in words, for substitution: **quantity numerals and the item code are the loudest elements**;
titles sit a step below; metadata is mid-weight grey at body size; units, legend and bar numbers are the
smallest, always bold enough to read at 11 px.

## Colour

### Neutrals

| Use | Value |
|-----|-------|
| App/page background | `#f2f2f3` |
| Surface (cards, toolbar, back button) | `#ffffff` |
| Card border | `#e6e6e8` |
| Internal card divider (quantity panel edge) | `#ededee` |
| Section divider (full-bleed) | `#e0e0e2` |
| Pill track | `#e3e3e5` |
| Tag background | `#f4f4f5` |
| Bar track / "remaining" grey | `#ededee` (legend swatch `#dcdcde`) |
| Thumbnail placeholder field | `#e6e4e0`, glyph `#b0aca6` |
| Primary ink | `#1c1c1e` |
| Secondary ink | `#6b6b70` |
| Tertiary ink | `#5f5f66` · `#63636a` · `#5a5a60` (all ≈AA on white) |
| Muted ink (units) | `#8e8e94` |
| Icon grey | `#8a8a90` |
| Drag handle | `#c2c2c7` |
| Dashed border (Add item) | `#b9c4d6`, hover `#98a6bd`, hover fill `#eceef2` |
| Mockup frame background (not part of the feature) | `#2e2e2e` |

### Status / semantic

| Meaning | Value | Used for |
|---------|-------|----------|
| Accent / fulfilled / `Working` | `#2f6ee0` | Bar fulfilled segment, drag-active border, Working pill text, links |
| Accent tint | `#eff5ff` bg / `#9cc0f5` border | Working pill |
| Link hover | `#1f4fae` | Anchor hover |
| In progress | `#b5801f` | Bar in-progress segment, legend swatch |
| Assigned | `#5b46a8` text / `#f3f0fb` bg / `#c0b3e6` border | Assigned pill (inferred) |
| Neutral status | `#5f5f66` text / `#f4f4f5` bg / `#d8d8dc` border | Pending / unknown status |
| Due today | `#9d3030` | Today badge |
| Overdue | `#7c1f1f` | Overdue badge (inferred) |
| Overlay label | `rgba(28,28,30,.72)` | Quantity badge on thumbnail |

Only three hues carry meaning: **blue = fulfilled/active**, **amber = in progress**, **red = date
urgency**. Grey is always "not yet". Do not add hues without a reason in this vocabulary.

## Spacing

The design uses a loose 2 px-based rhythm; the recurring values are:

- **Page gutter:** 16 px both sides, on every region.
- **List gap between cards:** 10 px (both screens).
- **Stacked controls in the header:** 14 px.
- **Inside a card body:** 8 px (list card) / 10–11 px (summary card, item card).
- **Tag gap:** 6 px. **Legend gap:** 12 px. **Icon-to-text gap:** 9–10 px.
- **Card body padding:** `13px 14px` (list), `15px 16px` (summary), `14px 12px 14px 16px` (item).
- **Region paddings:** header `18px 16px 0` (list) / `16px 16px 12px` (detail); list
  `14px 16px 26px` (list) / `0 16px 22px` (detail); section header `16px 16px 10px`.

## Radii

| Element | Radius |
|---------|--------|
| Pills, badges, quantity badge, count badge | `999px` |
| Summary card | `18px` |
| Stock need card, item card | `16px` |
| Search toolbar, Add-item button | `14px` |
| Back button | `10px` |
| Bar track, property tag | `6px` |
| Due badge | `8px` |
| Legend swatch | `2px` |
| Mockup phone frame | `22px` |

## Borders and shadows

- **Borders are hairlines** (1 px) and always neutral, except the accent border on a dragging card and the
  tinted borders on status pills.
- **Item task cards have no border** — they rely on a slightly stronger shadow
  (`0 1px 3px rgba(0,0,0,.08)`). Stock-need and summary cards use border + a lighter shadow
  (`0 1px 2px rgba(0,0,0,.05)`). Keep that distinction: it is what makes the task card read as the
  imported pattern it is.
- Selected priority pill: `0 1px 3px rgba(0,0,0,.12)` — the only shadow used to signal state.
- Mockup frame shadow (`0 18px 50px rgba(0,0,0,.35)`) is presentation only.

## Iconography

Line icons, `stroke-width` 1.6–2.2, no fills, 19–20 px in rows and toolbars, 28 px for the thumbnail
placeholder glyph.

| Icon | Where | Notes |
|------|-------|-------|
| Magnifier | search field | 20 px, `#63636a` |
| Sort (up/down arrows) | search toolbar | 20 px, `#6b6b70` |
| Filter (sliders) | search toolbar | 20 px, `#6b6b70`, hosts the count badge |
| Drag handle (two lines) | stock need card | 18 px, `#c2c2c7` |
| Chevron-left | detail back button | 20 px, `#1c1c1e` |
| Plus | Add item | 19 px, `#6b6b70`, stroke 2.2 |
| Wrench | item source row | 19 px, `#8a8a90` |
| Calendar | item date row | 19 px, `#8a8a90` |
| Image placeholder | item thumbnail | 28 px, `#b0aca6` |
| Vertical ellipsis | item card | three 4 px dots, 3 px gap, `#6b6b70` |
| Furniture type icons | quantity panels | **CSS-drawn placeholders** — replace with the real icon set at 30 px, 2 px stroke, transparent fill, `#5f5f66` |

All icons are decorative in the mockup; none carry a text label except through context.

## Controls

**Button hierarchy as designed** (there is no solid primary button anywhere in this feature):

1. **Add item** — dashed, transparent, neutral ink. The most prominent action, deliberately quiet.
2. **Priority pill (selected)** — white on grey track.
3. **Icon buttons** — back (white surface, bordered), sort/filter (bare glyphs), ⋮ (bare glyph).

**Input:** the search field has no visible border of its own (the toolbar row is the container), no focus
ring, and no clear button.

**Badges:** three distinct badge styles, do not merge them — bordered tinted **status pill** (radius 999),
solid red **due badge** (radius 8), solid dark **overlay quantity badge** (radius 999), plus the solid dark
**filter count badge** (radius 999).

**Progress indicator:** one component only — the segmented FulfilmentBar with numbers inside. No rings, no
percentages, no separate labelled rows. It exists at 20 px (list) and 22 px (summary) heights.

## Design-system alignment

No Manager design-system tokens or primitives were available when the mockup was made, so **nothing here
is a token reference**. Expected mapping work for the implementation agent:

- Replace the local neutral ramp with Manager's surface/border/text tokens, preserving the four-step ink
  hierarchy (primary → secondary → tertiary → muted).
- Map `#2f6ee0` to Manager's accent/primary, `#b5801f` to its warning/in-progress, and the reds to its
  danger scale.
- Reuse Manager's existing **task card**, **status pill** and **overflow menu** components wherever they
  exist — the item card in this design is an import of that pattern, not a new component.
- Replace the CSS-drawn furniture icons with real icons.
