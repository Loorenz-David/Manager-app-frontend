# 05 — UI States

Each state is tagged **Explicit** (present in the mockup) or **Inferred** (needed for coherence, not mocked).
Inferred states describe the minimum visual consequence of existing rules; they are proposals, not
established design.

---

## A. Fulfilment states of a stock need

Driven by `required`, `fulfilled`, `in progress`, and `remaining = max(0, required − fulfilled − in progress)`.

| # | State | Bar appearance | Tag |
|---|-------|----------------|-----|
| A1 | **No progress** (fulfilled 0, progress 0) | Entire track grey; the remaining number equals required and sits centred in the grey area. No coloured segment renders. | Inferred (data supports it; no mock row has it) |
| A2 | **Partially fulfilled** (e.g. 30 / 8 / 4 → 18) | Blue segment labelled `8`, amber labelled `4`, grey labelled `18`. | Explicit |
| A3 | **Nothing fulfilled, work started** (16 / 0 / 6 → 10) | No blue segment; amber labelled `6`; grey labelled `10`. | Explicit (list row "Dining chair · Walnut · Ladder back") |
| A4 | **Mostly done, thin slices** (e.g. 30 / 29 / 1) | Minimum-width rules apply: each coloured segment keeps ≥14%, both are scaled into a 84% budget, and the grey segment always retains room for its number. Numbers never clip. | Explicit rule in the design's bar logic |
| A5 | **Fully accounted, none delivered** (fulfilled + progress = required, remaining 0) | No grey segment; blue + amber fill the whole track (budget becomes 100%). The remaining number is omitted (0 renders as nothing). | Explicit rule |
| A6 | **Complete** (fulfilled = required) | Blue fills the whole track, labelled with the total. No amber, no grey, no remaining number. | Inferred |
| A7 | **Over-fulfilled** (fulfilled > required) | Undefined. The bar clamps at 100% and the extra is invisible; no "+2" indicator is designed. Needs a product decision. | Unspecified |

Nothing else on the card changes across A1–A6: the required number, title, tags and drag handle are
constant. There is **no** completed-card treatment (no green accent, no checkmark, no dimming) in the
mockup. If "complete" needs to be recognisable at a glance in the list, that is a new design decision.

---

## B. Stock-need card interaction states

| # | State | Appearance | Tag |
|---|-------|-----------|-----|
| B1 | Default | White, `1px #e6e6e8`, `0 1px 2px rgba(0,0,0,.05)`, opacity 1 | Explicit |
| B2 | Dragging | Border `#2f6ee0`, opacity `.65`, type icon stroke `#2f6ee0` | Explicit |
| B3 | Drop target | No treatment — the list reflows instead of showing an indicator | Explicit (absence is deliberate) |
| B4 | Hover | Not defined | Unspecified |
| B5 | Pressed | Not defined | Unspecified |
| B6 | Disabled | Not defined; no read-only variant exists | Unspecified |

---

## C. List screen states

| # | State | Appearance | Tag |
|---|-------|-----------|-----|
| C1 | Bucket with results | Flat card list, 10 px gaps | Explicit |
| C2 | Bucket empty / query with no match | Single centred line `No stock need matches these filters.`, 14 px / 500, `#63636a`, `padding 46px 20px`. Filter bar and search remain in place and enabled. | Explicit |
| C3 | Loading | Not designed. A skeleton matching card geometry (72 px panel + three stacked blocks) would be the coherent choice. | Inferred |
| C4 | Error | Not designed | Unspecified |
| C5 | Filters active | Dark count badge on the filter glyph | Explicit styling, never populated in the mockup |
| C6 | Search focused | Input has no focus ring (`outline: none`) and the row's border does not change | Explicit — and a likely accessibility gap; see ambiguities |

---

## D. Priority pill states

| # | State | Appearance | Tag |
|---|-------|-----------|-----|
| D1 | Selected (High/Medium/Low) | White fill + `0 1px 3px rgba(0,0,0,.12)`, text `#1c1c1e` | Explicit |
| D2 | Unselected | Transparent, text `#5a5a60` | Explicit |
| D3 | `Unset` active | Renders exactly as D2 — no active fill | Explicit and intentional |
| D4 | Hover / focus | Not defined | Unspecified |

---

## E. Detail screen states

| # | State | Appearance | Tag |
|---|-------|-----------|-----|
| E1 | Need with items | Summary card + Add item + divider + section header (`4 items`) + item cards | Explicit |
| E2 | Need with no items | Item list replaced by `No items selected for this stock need yet.` (14 px / 500, `#63636a`, `padding 40px 20px`, centred). Section count would read `0 items`. Summary card and Add-item button unchanged and still visible. | Explicit |
| E3 | One item | Count reads `1 item` (singular) | Explicit rule |
| E4 | Loading | Not designed | Inferred/unspecified |
| E5 | Error | Not designed | Unspecified |
| E6 | Summary bar states | Identical to section A, at 22 px bar height, plus the legend which never changes | Explicit |

---

## F. Item (task) card states

| # | State | Appearance | Tag |
|---|-------|-----------|-----|
| F1 | `Working` | Blue-tinted pill (`#eff5ff` / `#9cc0f5` / `#2f6ee0`) | Explicit (matches reference screenshot) |
| F2 | `Assigned` | Violet-tinted pill (`#f3f0fb` / `#c0b3e6` / `#5b46a8`) | Inferred |
| F3 | `Pending` / unknown status | Neutral pill (`#f4f4f5` / `#d8d8dc` / `#5f5f66`) — the fallback for any status not explicitly styled | Inferred |
| F4 | Due today | `Today` badge, `#9d3030` | Explicit |
| F5 | Overdue | `Overdue` badge, `#7c1f1f` | Inferred |
| F6 | No due emphasis | Badge omitted; date stands alone | Explicit |
| F7 | Missing photo | Placeholder field `#e6e4e0` with a centred image glyph `#b0aca6`. This is what every card shows in the mockup. | Explicit (as placeholder) |
| F8 | Long source text | Truncates to one line with an ellipsis | Explicit |
| F9 | Hover / pressed / selected | Not defined | Unspecified |
| F10 | Completed item | No completed treatment is designed for an item card | Unspecified |

Status vocabulary in the mockup is `Working`, `Assigned`, `Pending`. Only `Working` is taken from
the reference screenshot; the other two were added to show variety. The real vocabulary must come from the
existing task card in Manager — reuse it rather than this list.
