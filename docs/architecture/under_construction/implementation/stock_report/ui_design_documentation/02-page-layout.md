# 02 — Page Layout

All measurements are taken from the mockup. Both screens live in a 430 px-wide shell with 16 px side
gutters. The shell is mockup chrome; in the application the content should fill the app's own page frame.

---

## Screen 1 — Stock need list

```
┌──────────────────────────────── 430 ────────────────────────────────┐
│ 18 top padding                                                      │
│ ┌ PriorityFilterBar ────────────────────────────────────────────┐   │
│ │ [ Unset ][ High ][ Medium ][ Low ]   4 equal-width pills      │   │
│ └───────────────────────────────────────────────────────────────┘   │
│ 14 gap                                                              │
│ ┌ SearchToolbar ────────────────────────────────────────────────┐   │
│ │ 🔍  Search stock need...        │ ⇅   ⚙filter(+badge)        │   │
│ └───────────────────────────────────────────────────────────────┘   │
│ 14 gap + 16 spacer                                                  │
├──────────────────── 1px divider #e0e0e2 ───────────────────────────┤
│ 14 top padding                                                      │
│ ┌ StockNeedCard ────────────────────────────────────────────────┐   │
│ │ ┌ 72px ─┐│                                                    │   │
│ │ │ icon  ││ Dining chair                              ≡ handle │   │
│ │ │ 30 pc ││ [Oak] [Spindle back]                              │   │
│ │ └───────┘│ ▓▓8▓▓ ▓4▓ ░░░░░░░░18░░░░░░░░                      │   │
│ └───────────────────────────────────────────────────────────────┘   │
│ 10 gap → next card …                                                │
│ 26 bottom padding                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Regions

| Region | Padding | Notes |
|--------|---------|-------|
| Header block | `18px 16px 0`, children stacked with `gap: 14px` | Contains filter bar, search toolbar, and a 16 px spacer that creates the breathing room above the divider |
| Divider | full-bleed, 1 px, `#e0e0e2` | Separates controls from content |
| List | `14px 16px 26px`, `gap: 10px` | Vertical flex column |

### Containers

- **PriorityFilterBar** — pill track: `background #e3e3e5`, `border-radius 999px`, `padding 4px`,
  `gap 2px`; each pill `flex: 1` (equal widths), `padding 9px 4px`, `border-radius 999px`.
- **SearchToolbar** — one row: white, `border-radius 14px`, `1px solid #e6e6e8`, `padding 12px 14px`,
  `gap 10px`, vertically centred. Order: search icon, input (`flex: 1`), 1×22 px vertical rule
  `#e6e6e8`, sort icon, filter icon. The filter icon hosts an absolutely-positioned count badge at
  `top: -8px; right: -12px`.
- **StockNeedCard** — `display: flex`, white, `border-radius 16px`, `1px solid #e6e6e8`,
  `box-shadow 0 1px 2px rgba(0,0,0,.05)`, `overflow: hidden`. Two columns:
  - left **QuantityPanel**: fixed `72px`, `border-right 1px solid #ededee`, two equal rows
    (`flex: 1` each), each centred: row 1 the type icon (`padding 12px 8px 8px`), row 2 the number +
    "pc" (`padding 0 8px 12px`, `gap 3px`, baseline-ish centre alignment).
  - right **NeedBody**: `flex: 1; min-width: 0`, `padding 13px 14px`, column with `gap 8px`:
    title row (title left, drag handle right, `align-items: flex-start`, handle `margin-top 2px`),
    property tag row (`flex-wrap: wrap; gap 6px`), fulfilment bar (`margin-top 1px`).

### Ordering and scrolling

- Cards render in user-defined order (see `04-interactions.md`); the mockup's default order is the data
  order filtered to the active priority.
- The whole page scrolls. No sticky elements on this screen. The filter bar and search toolbar scroll away
  with the content in the mockup — **stickiness is unspecified**; see `06-responsive-behavior.md`.
- No overlays, drawers or modals exist on this screen.

---

## Screen 2 — Stock need detail

```
┌──────────────────────────────── 430 ────────────────────────────────┐
│ ┌ DetailHeaderBar ─ 16px 16px 12px ────────────────────────────┐    │
│ │ [←34×34]  Dining chair                                       │    │
│ └──────────────────────────────────────────────────────────────┘    │
│ ┌ NeedSummaryCard ─ side 16, bottom 16 ────────────────────────┐    │
│ │ ┌ 82px ─┐│ [Oak] [Spindle back]                              │    │
│ │ │ icon  ││ ▓▓▓8▓▓▓ ▓▓4▓▓ ░░░░░░18░░░░░░                      │    │
│ │ │ 30 pc ││ ■Fulfilled ■In progress ■Remaining                │    │
│ │ └───────┘│                                                   │    │
│ └──────────────────────────────────────────────────────────────┘    │
│ ┌ + Add item (dashed, full width, margin-top 12) ──────────────┐    │
│ └──────────────────────────────────────────────────────────────┘    │
├──────────────────── 1px divider #e0e0e2 ───────────────────────────┤
│ Selected items                                        4 items      │
│ ┌ ItemTaskCard (min-height 132) ───────────────────────────────┐    │
│ │ ┌ 132×full ──┐│ #0000808        (Working)   ⋮               │    │
│ │ │   photo     ││ 🔧 Internal                                 │    │
│ │ │        (#4) ││ 📅 16-09-2026  [Today]                      │    │
│ │ └─────────────┘│                                             │    │
│ └──────────────────────────────────────────────────────────────┘    │
│ 10 gap → next card …               22 bottom padding               │
└─────────────────────────────────────────────────────────────────────┘
```

### Regions

| Region | Padding / spacing |
|--------|-------------------|
| DetailHeaderBar | `16px 16px 12px`, row, `gap 10px`, `align-items: center` |
| Summary block | `0 16px 16px` — holds the summary card and, below it, the Add-item button with `margin-top: 12px` |
| Divider | full-bleed 1 px `#e0e0e2` |
| SectionHeader | `16px 16px 10px`, label left, count right (`justify-content: space-between`) |
| Item list | `0 16px 22px`, `gap 10px` |

### Containers

- **BackButton** — 34×34, white, `1px solid #e6e6e8`, `border-radius 10px`, chevron centred.
- **NeedSummaryCard** — white, `border-radius 18px`, `1px solid #e6e6e8`,
  `box-shadow 0 1px 2px rgba(0,0,0,.05)`, two columns:
  - **QuantityPanel** `82px`, `border-right 1px solid #ededee`, two `flex: 1` rows (icon; number +
    "pc"), paddings `14px 8px 10px` / `0 8px 14px`.
  - **SummaryBody** `flex: 1; min-width: 0`, `padding 15px 16px`, column `gap 10px`: property tags,
    fulfilment bar (22 px tall), legend row (`flex-wrap: wrap; gap 12px`).
  - The summary card **does not** repeat the need title — the page title carries it.
- **AddItemButton** — full width, dashed `1px #b9c4d6`, `border-radius 14px`, `padding 14px 18px`,
  transparent background, centred icon + label with `gap 9px`.
- **ItemTaskCard** — `display: flex`, white, `border-radius 16px`,
  `box-shadow 0 1px 3px rgba(0,0,0,.08)`, **no border**, `overflow: hidden`, `min-height 132px`,
  `flex: none` (must not shrink):
  - **ItemThumbnail** — fixed `132px` wide, full card height, `position: relative`, placeholder
    background `#e6e4e0` with a centred image glyph; quantity badge absolutely placed
    `right: 8px; bottom: 8px`.
  - **Body** — `flex: 1; min-width: 0`, `padding 14px 12px 14px 16px`, column,
    `justify-content: center`, `gap 11px`: header row (code `flex: 1`, status pill, ⋮ menu,
    `gap 10px`), source row, date row (both `gap 9px`, icon `flex: none`).
  - Source text truncates with ellipsis on one line; the date row does not truncate.

### Ordering and scrolling

- The **entire page scrolls as one**. There is no bounded shell, no internal scroller, and no sticky
  footer. (An earlier iteration pinned "Add item" to the bottom; that was replaced deliberately — the
  button now belongs to the header block so the item list gets the full remaining space.)
- Item cards appear in data order. No manual reordering on this screen.
- No overlays, drawers or modals are designed. The ⋮ menu and the Add-item destination are undesigned
  surfaces — see ambiguities.
