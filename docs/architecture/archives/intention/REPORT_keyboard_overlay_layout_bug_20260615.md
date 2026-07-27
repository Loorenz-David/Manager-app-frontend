# REPORT — Keyboard overlay breaks bottom-sheet layout after keyboard closes

- Report ID: `REPORT_keyboard_overlay_layout_bug_20260615`
- Status: `diagnostic — no implementation`
- Author: Claude (analysis only)
- Date (UTC): `2026-06-15`
- Subject prototype: `SUMMARY_PLAN_keyboard_overlay_prototype_20260607`

## TL;DR

The bug is **not** in the prototype's `useVisualViewport` hook or the portal bar by
themselves. It is a **conflict between two independent systems that both react to
the mobile software keyboard and both mutate the layout of the same bottom sheet**:

1. **Vaul's own `repositionInputs` machinery** (enabled by default in
   `BottomSheetSurface`), which writes inline `height` and `bottom` styles directly
   onto the drawer DOM node whenever an input is focused and the visual viewport
   shrinks.
2. **The prototype's portal bar**, which renders a *second* copy of the input into
   `document.body` and positions itself at `bottom: keyboardHeight`.

Because the prototype's portal input is a real `<input>`, Vaul still believes "an
input is focused" and resizes/raises the drawer — even though the focused field
lives outside the drawer. When the keyboard closes, Vaul's restore path is
unreliable and leaves **stale inline `height` / `bottom` styles on the drawer**,
which is the "layout all messed up" state you see in the screenshots.

## How the current pieces fit together

- `BottomSheetSurface.tsx` renders `vaul`'s `Drawer.Content` as
  `fixed inset-x-0 bottom-0 max-h-[90dvh]`, with `modal={false}` and **no**
  `repositionInputs` prop → Vaul's default `repositionInputs = true` is active.
- `ItemUpholsteryAmountSheetPage.tsx` (the prototype) renders, via
  `createPortal(..., document.body)`, a floating bar with a **second** `NumberInput`
  pinned at `style={{ bottom: keyboardHeight }}`, and hides the in-sheet input with
  `invisible` while the keyboard is open.
- Both the page and Vaul subscribe to `window.visualViewport` `resize`/`scroll`.

## Root cause (verified against `node_modules/vaul/dist/index.js` @ 1.1.2)

Vaul registers `onVisualViewportChange` (index.js ~line 1135). On every viewport
resize it does, in essence:

```js
const focusedElement = document.activeElement;
if (isInput(focusedElement) || keyboardIsOpen.current) {
  // ...compute keyboard height...
  // shrink the drawer:
  drawerRef.current.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
  // lift it above the keyboard:
  drawerRef.current.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
}
```

Three facts make this fatal for the prototype:

1. **`isInput()` matches the portal input.** Vaul's `isInput` (index.js ~line 353)
   returns true for any `HTMLInputElement` with a text-like type — it does **not**
   check whether the element is inside the drawer. Our portal `NumberInput` lives in
   `document.body`, yet Vaul reacts to it focusing and starts resizing the *drawer*.

2. **`resetDrawer()` does not undo those styles.** On close, Vaul's `resetDrawer()`
   (index.js ~line 1207) only resets `transform` and `transition`. It **never clears
   the inline `height` or `bottom`** that `onVisualViewportChange` wrote. Those
   values are only ever corrected by the *same* viewport handler running again and
   reaching its restore branch.

3. **The restore branch is conditional and races the blur.** Height is only restored
   in the `else if (!isMobileFirefox())` branch, and the whole block is gated on
   `isInput(document.activeElement) || keyboardIsOpen.current`. When the keyboard
   dismisses, `activeElement` becomes `<body>` (no longer an input) and
   `keyboardIsOpen.current` may have already toggled false (60px threshold logic),
   so the final resize **skips the block entirely** and the drawer keeps its stale
   shrunken `height` + raised `bottom`. Result: a sheet floating detached from the
   bottom of the screen with the wrong height.

This is why it looks fine *until you type and dismiss* — the corruption is the
leftover inline style that nothing cleans up.

### Secondary aggravating factors

- **Double layout authority.** Even mid-keyboard, you have two systems positioning
  for the keyboard at once: Vaul lifts/shrinks the whole drawer (with the original
  input hidden by `invisible`) *and* the portal bar sits at `bottom: keyboardHeight`.
  They use different math and different anchors, so they can disagree by several
  pixels and produce a visible seam/jump even before dismissal.
- **`invisible` keeps layout height.** Hiding the in-sheet block with `invisible`
  (rather than removing it) preserves its height, which feeds Vaul's
  `initialDrawerHeight` capture and the `90dvh` clamp — so Vaul's "initial height"
  reference and the real content height can diverge.
- **No teardown of the prototype's own assumptions.** The page also relies on
  `isKeyboardOpen` toggling cleanly; the same 100px/60px threshold races mean the
  portal and Vaul can briefly disagree about whether the keyboard is open.

## Why I did not "reproduce" this in Playwright

This is a **software-keyboard** bug. Desktop Chromium under Playwright has no soft
keyboard and **does not shrink `window.visualViewport.height` on input focus**, so
neither Vaul's handler nor `useVisualViewport` fires the way they do on a phone. I
could only fake it by dispatching synthetic `visualViewport` resize events, which
would just re-stage the source-code behavior I already traced above rather than
prove anything new. The code path is unambiguous, so I prioritized the static
analysis. If you want, I can still build a synthetic-viewport harness page to
*visually demonstrate* the leftover inline styles on the drawer node — say the word.

To confirm on a real device in ~30 seconds: open the sheet, type, dismiss the
keyboard, then in devtools inspect the `[data-vaul-drawer]` content node — you will
see leftover inline `height: …px` and `bottom: …px` that were never cleared.

## Options to fix it (ranked)

### Option A — Stop fighting Vaul; let the sheet itself host the keyboard-aware input *(recommended)*

Disable Vaul's input repositioning for this surface and instead make the sheet's own
scroll container keyboard-aware, with **one** authority for keyboard layout.

- Set `repositionInputs={false}` on `Drawer.Root` in `BottomSheetSurface` (or expose
  it as a per-surface prop) so Vaul never writes `height`/`bottom` from viewport
  events.
- Pad/inset the sheet's scroll area by the keyboard height (a single source of
  truth, e.g. a `--keyboard-inset` CSS var driven by one `useVisualViewport`), and
  let the real in-sheet input scroll into view — no portal, no duplicate input.
- Pros: removes the dual-authority conflict at the root; works for *any* input in
  *any* sheet; no second input to keep in sync; survives keyboard open/close cleanly.
- Cons: requires touching shared `BottomSheetSurface`; need to validate Vaul still
  feels natural without its repositioning; real-device testing required.

### Option B — Keep the portal, but neutralize Vaul + guarantee cleanup

Keep the floating-bar pattern but make the two systems stop overlapping:

- `repositionInputs={false}` so Vaul never mutates the drawer for keyboard.
- Render the portal bar **outside** any element Vaul tracks (already true) and, on
  keyboard close, explicitly clear any inline `height`/`bottom` Vaul may have left
  (defensive) — though with `repositionInputs={false}` there should be none.
- Pros: smallest change to the prototype's UX; the floating bar stays.
- Cons: still maintains a *duplicate* input (the in-sheet `invisible` one plus the
  portal one) and the focus/`mousedown` juggling; reusability is awkward because
  every consumer must hand-build a portal twin. Doesn't generalize cleanly.

### Option C — Extract a real reusable primitive (the "do it properly" path)

Build a `KeyboardAwareSheet` / `FloatingInputBar` primitive that owns: one
`useVisualViewport`, the `repositionInputs={false}` coordination with the surface,
the single-input (no duplicate) model, and works identically for Vaul bottom sheets
and other surfaces (modal, slide page).

- Pros: meets your stated goal — "use this type of input anywhere… reliable." One
  tested code path; consumers just declare an input as keyboard-aware.
- Cons: largest effort; needs a small design pass and real-device test matrix
  (iOS Safari, Android Chrome, PWA standalone).

## Recommendation

Adopt **Option A as the foundation** (kill the dual authority by disabling
`repositionInputs` and giving the sheet a single keyboard-inset source of truth),
and if the floating-above-keyboard affordance is still wanted, fold it into
**Option C** as the reusable primitive — built on top of A, never alongside Vaul's
repositioning. Option B is acceptable only as a quick stopgap and should not be the
long-term answer because the duplicate-input model won't generalize.

## Linked implementation plans

| Plan | Status | Summary |
| --- | --- | --- |
| `docs/architecture/archives/implementation/PLAN_keyboard_aware_inputs_20260615.md` | `archived` | `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_aware_inputs_20260615.md` |

## Progress notes

- `2026-06-15T10:27:04Z` `Codex`: Implemented the shared keyboard-aware input foundation:
  `useVisualViewport`, `KeyboardInsetProvider`, `FloatingKeyboardBar`, global Vaul
  `repositionInputs={false}`, shared bottom-sheet centralization, and the upholstery
  amount sheet refactor. Root `npm run typecheck` passed.

## What an implementation plan would need to decide (open questions for you)

1. Is the **floating bar above the keyboard** a required UX, or is "input simply
   stays visible above the keyboard inside the sheet" acceptable? (Changes A vs C.)
2. Should `repositionInputs` be turned off **globally** in `BottomSheetSurface`, or
   exposed per-surface? (Other sheets may rely on current behavior.)
3. Which surfaces must support keyboard-aware inputs beyond bottom sheets
   (ModalSurface, SlidePageSurface)? Confirms how general the primitive must be.
4. Target/runtime matrix to validate against (iOS Safari PWA standalone, Android
   Chrome, in-app webview?).
