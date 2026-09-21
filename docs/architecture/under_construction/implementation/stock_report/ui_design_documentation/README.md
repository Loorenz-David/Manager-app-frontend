# Stock Need (Stock Request) — Design Handoff

Design source of truth: `Stock Need.dc.html` (list) and `Stock Need Detail.dc.html` (detail).
This package documents **design intent, structure, visual language and interaction behavior only**.
Engineering decisions (component APIs, state management, data fetching, API contracts) are intentionally
left to the implementation agent.

> Naming note: the mockups use the term **"stock need"** in UI copy (page purpose: communicate a goal to
> fulfil). The feature is referred to as **Stock Request** in the product. Copy in the mockup says
> "Search stock need…", "No stock need matches these filters." Keep or rename per product decision — see
> `Design Ambiguities` in `08-implementation-checklist.md`.

## Purpose of the interface

A stock need expresses a **goal to fulfil**: how many units of a given furniture configuration are
required, how many are already fulfilled, and how many are being worked on. The interface lets a manager

1. scan the outstanding stock needs, one priority bucket at a time, and reorder them by hand inside that
   bucket to express working sequence;
2. open a single stock need and see which production/purchase items have been selected to fulfil it, and
   add more items.

## Screens in the mockup

| # | Screen | File | Role |
|---|--------|------|------|
| 1 | Stock need list | `Stock Need.dc.html` | Browse / filter / prioritise stock needs |
| 2 | Stock need detail | `Stock Need Detail.dc.html` | One stock need + the items selected to fulfil it |

Both screens are designed at **mobile width (430 px shell)** and presented inside a phone-style frame.
The frame (dark page background, 22 px radius, drop shadow) is presentation chrome for the mockup, **not
part of the feature**.

## Major regions

**Screen 1 — list**

```
┌ priority segmented control (Unset / High / Medium / Low) ┐
├ search field + sort icon + filter icon                   ┤
├ divider                                                  ┤
└ stock-need card list (flat, ordered, drag-reorderable)   ┘
```

**Screen 2 — detail**

```
┌ back arrow + page title (furniture type)  ┐
├ summary header card (icon · required · properties · progress bar · legend) ┤
├ "Add item" dashed button                  ┤
├ divider                                   ┤
├ "Selected items" section label + count    ┤
└ item (task) card list                     ┘
```

## Primary flows represented

1. **Prioritised scan** — user taps a priority pill → list shows only stock needs of that priority →
   user drags cards to set the order of work inside that priority.
2. **Search** — user types in the search field → list narrows to matching needs.
3. **Open a need** — user taps a stock-need card → detail screen (navigation target implied, see
   `04-interactions.md`).
4. **Review fulfilment** — detail header communicates required / fulfilled / in-progress / remaining in
   one bar; the item list below shows the concrete items carrying that work.
5. **Add an item** — user taps the dashed "Add item" button → expected to open an item picker
   (not designed; see ambiguities).
6. **Back** — back arrow returns to the list.

## Component hierarchy (as mocked)

```
StockNeedListPage
├── PriorityFilterBar
│   └── PriorityPill            × 4 (Unset, High, Medium, Low)
├── SearchToolbar
│   ├── SearchInput
│   ├── SortControl             (icon only, inert in mockup)
│   └── FilterControl           (icon only, inert; supports a count badge)
├── Divider
└── StockNeedList
    ├── StockNeedCard           × n  (draggable)
    │   ├── QuantityPanel       (type icon + required quantity + "pc")
    │   └── NeedBody
    │       ├── NeedTitle + DragHandle
    │       ├── PropertyTagRow → PropertyTag × n
    │       └── FulfilmentBar   (fulfilled / in-progress / remaining segments)
    └── EmptyState

StockNeedDetailPage
├── DetailHeaderBar
│   ├── BackButton
│   └── PageTitle               (furniture type)
├── NeedSummaryCard
│   ├── QuantityPanel           (type icon + required quantity + "pc")
│   └── SummaryBody
│       ├── PropertyTagRow → PropertyTag × n
│       ├── FulfilmentBar
│       └── FulfilmentLegend    (Fulfilled / In progress / Remaining)
├── AddItemButton               (dashed, low emphasis)
├── Divider
├── SectionHeader               ("Selected items" + item count)
└── SelectedItemList
    ├── ItemTaskCard            × n
    │   ├── ItemThumbnail       (photo + quantity badge)
    │   ├── ItemHeader          (code + StatusPill + OverflowMenu)
    │   ├── SourceRow           (wrench icon + source)
    │   └── DateRow             (calendar icon + date + DueBadge)
    └── EmptyState
```

## Document map

| File | Contains |
|------|----------|
| `01-information-architecture.md` | What each screen communicates, hierarchy, navigation |
| `02-page-layout.md` | Regions, containers, spacing, scrolling, ordering |
| `03-component-specification.md` | Per-component anatomy, content, variants, states |
| `04-interactions.md` | Action → response → resulting state for every interaction |
| `05-ui-states.md` | Explicit and inferred visual states |
| `06-responsive-behavior.md` | What the mockup defines and what is unspecified |
| `07-visual-system.md` | Type, colour, spacing, radii, shadows, icons, badges |
| `08-implementation-checklist.md` | Visual/interaction acceptance checklist + open decisions |
