# 06 — Responsive Behavior

## What the mockup actually defines

Both screens are designed **once**, at a fixed **430 px** content width inside a phone-style frame. There
is no second breakpoint in the design, no desktop composition, and no tablet composition.

Everything below that width is therefore either a rule the mockup's layout already implies, or explicitly
unspecified. Nothing here should be treated as a designed desktop experience.

## Implied fluid behavior (already in the layout)

These follow from the way the mockup is built and should be preserved:

| Element | Behavior |
|---------|----------|
| Priority pills | Four `flex: 1` pills — they share the available width equally and shrink together. Labels are single words and are not truncated in the design. |
| Search toolbar | Search input is `flex: 1; min-width: 0`; the glyphs and the divider are fixed. The row never wraps. |
| Stock need card | Left quantity panel is fixed (72 px); the body is `flex: 1; min-width: 0` and absorbs all width change. |
| Property tags | `flex-wrap: wrap` with 6 px gaps — they wrap onto more lines as width shrinks. |
| Fulfilment bar | Fully fluid; segment widths are percentages, so it scales at any width. Minimum-width and remaining-budget rules keep the numbers readable as the bar narrows. |
| Item card | Thumbnail fixed at 132 px; body `flex: 1; min-width: 0`. Source text truncates with an ellipsis. |
| Legend | `flex-wrap: wrap`, 12 px gaps — wraps to two lines when needed. |
| Both pages | Scroll vertically as a single document; no internal scrollers, no sticky elements. |

## Narrow phones (< 430 px)

Unspecified, but the layout above degrades gracefully: the card bodies shrink, tags and legend wrap, the
source text truncates. The one thing to watch is the item card, where a fixed 132 px thumbnail plus a
21 px code, a status pill and the ⋮ menu compete on the header row. **No collapse rule is designed** for
that row (e.g. moving the pill below the code, or shrinking the thumbnail). If it must survive a 320 px
viewport, that is a new design decision.

## Tablet / desktop

**Unspecified.** The design is mobile-only. Do not invent a multi-column list, a master-detail split, a
table view, or a max-width centred page from this documentation — those are product/design decisions.

If the Manager application renders this feature inside a desktop shell, the minimum safe interpretation is:
keep the mobile composition, constrain the content column to roughly its designed width, and let the
application's own page chrome provide the surrounding layout. Confirm before building anything more.

## Not defined at any size

- Sticky behavior for the priority filter bar and search toolbar while scrolling a long list.
- Touch vs pointer differences beyond the Add-item hover state.
- Drag-and-drop on touch devices (the mockup uses HTML drag semantics; touch reordering needs its own
  interaction design — long-press threshold, auto-scroll at the edges, drop indicator).
- Keyboard interaction and focus order anywhere in either screen.
