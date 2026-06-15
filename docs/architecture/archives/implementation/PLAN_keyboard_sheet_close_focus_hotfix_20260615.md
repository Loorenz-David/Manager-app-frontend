# PLAN_keyboard_sheet_close_focus_hotfix_20260615

## Metadata

- Plan ID: `PLAN_keyboard_sheet_close_focus_hotfix_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T11:16:16Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_sheet_lift_hotfix_20260615.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_keyboard_sheet_lift_hotfix_20260615.md`

## Goal and intent

- Goal: Eliminate the keyboard "flash" that occurs when **closing** a bottom sheet after the
  keyboard was used inside it. Repro: open the quantity sheet from `TaskDetailSlidePage`, tap the
  input (keyboard opens), dismiss the keyboard (sheet returns to rest), then close the sheet — for
  a few hundred ms the keyboard re-opens with the input lifted to the top, then everything
  closes. If the keyboard was never opened, closing the sheet is clean.
- Business/user intent: The keyboard-lift hotfix made in-sheet typing work correctly; this
  residual close-time flash is a polish bug that makes the sheet feel buggy. It must be fixed
  before the larger keyboard-aware cleanup proceeds.
- Non-goals:
  - No change to the keyboard-open/lift behavior delivered by the lift hotfix (that works).
  - No surface centralization, primitive API changes, or validation-gate work (corrections plan).
  - No query/action/domain contract changes — UI/layout layer only.

## Root cause (from code analysis)

When the sheet closes, focus is re-applied to the sheet's input during the Vaul/Radix teardown,
which re-summons the software keyboard; the keyboard then drives `--keyboard-inset` up, the
closing sheet lifts (`bottom: var(--keyboard-inset)`), and the input visibly jumps to the top
until the sheet finishes unmounting and the keyboard drops. Established facts:

- `BottomSheetSurface`'s `Drawer.Content` is a Radix `DialogPrimitive.Content` (verified in
  `node_modules/vaul/dist/index.js`). Vaul overrides `onOpenAutoFocus` but **forwards
  `onCloseAutoFocus` to Radix via `...rest`**, so Radix's default close-time focus management is
  active and uncontrolled here.
- The quantity sheet (`ItemQuantitySheetPage`) contains **no `.focus()` of our own** — so the
  re-focus on close originates entirely from the surface/close machinery, not feature code.
- The upholstery sheet additionally has `FloatingKeyboardBar`'s effect
  (`if (isKeyboardOpen) inputRef.current?.focus()`). A transient `isKeyboardOpen` flip during the
  close can turn into a real `focus()` call, amplifying the same flash. Fixing the root close
  behavior removes the trigger; a guard makes the floating bar robust regardless.
- The flash is gated on "keyboard was opened" because that is the only path that leaves the
  in-sheet input as a live focus target at close time.

The exact OS-level step (Radix focus restoration vs. iOS re-presenting the keyboard for a
referenced input) cannot be isolated headlessly — there is no software keyboard in CI. The fix
therefore makes the entire close sequence focus-safe, which neutralizes every identified path, and
on-device validation (below) confirms/bisects which layer was responsible.

## Clarifications required

_None — scope is self-contained; on-device validation gates the fix._

## Acceptance criteria

1. Open the quantity sheet from `TaskDetailSlidePage`, focus the input (keyboard opens), dismiss
   the keyboard, then close the sheet → the sheet closes cleanly with **no keyboard flash and no
   upward jump**.
2. The same holds when the sheet is closed via every path: the close/Save button, the backdrop,
   and the Vaul drag handle.
3. The upholstery amount sheet (FloatingKeyboardBar consumer) closes cleanly after the keyboard
   was used, with no flash.
4. Closing a sheet where the keyboard was never opened still works exactly as before.
5. Opening the keyboard and typing (the lift-hotfix behavior) is unchanged and still correct.
6. `npm run typecheck`: zero errors.

## Contracts and skills

### Contracts loaded

- `Frontend_architecture/28_surfaces.md`: close-time focus handling belongs in the shared surface
  chrome (`BottomSheetSurface`), not in feature pages.
- `Frontend_architecture/23_providers.md`: any `KeyboardInsetProvider` / `FloatingKeyboardBar`
  guard keeps the existing public shape; only internals change.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Relational reads permitted: `BottomSheetSurface.tsx`, `KeyboardInsetProvider.tsx`,
  `FloatingKeyboardBar.tsx`, and the quantity/upholstery sheet pages (confirm no regression).
- No pattern reads required.

### Skill selection

- Primary skill: none (surface chrome + provider/primitive internals).
- Trigger terms: `keyboard, focus, vaul, radix, onCloseAutoFocus, bottom sheet`.

## Implementation plan

Apply as layered, complementary guards (each is low-risk and independently valuable); validate
on-device after each so the responsible layer is identified.

1. **Neutralize Radix close-focus restoration.** In
   `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`, pass
   `onCloseAutoFocus={(event) => event.preventDefault()}` to `Drawer.Content` (Vaul forwards it to
   Radix). This stops Radix from moving focus when the dialog tears down — the standard remedy for
   "focus jumps / keyboard flashes on dialog close." Accept the trade-off that focus is not
   programmatically returned to the trigger (acceptable in this touch PWA; the slide surface
   underneath is not a focus trap).

2. **Actively blur on close.** In `handleClose` (before `setIsOpen(false)`), if
   `document.activeElement` is a focusable input/textarea/contenteditable, call `.blur()` on it so
   the keyboard is dismissed and there is no live focus target as the close animation begins. This
   also covers paths where the input is still focused at close time.

3. **Guard `FloatingKeyboardBar` auto-focus against close transitions.** In
   `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`, only run
   the `inputRef.current?.focus()` effect on a genuine closed→open transition while the bar is
   actually rendered (e.g. focus from the same render that mounts the portal, not from any
   `isKeyboardOpen` truthiness), so a transient flip during sheet close cannot re-summon the
   keyboard. Do not focus if the portal is not (or is no longer) mounted.

3b. **(Only if Step 3 is insufficient) Debounce spurious open flips in the provider.** If
   on-device testing shows `isKeyboardOpen` briefly flipping true during close, add a small
   settle/debounce in `KeyboardInsetProvider` so `isKeyboardOpen` does not flip true for a sub-100ms
   blip. Keep `--keyboard-inset` imperative and unthrottled (layout stays accurate); only the
   boolean is debounced. Implement this only if needed, to avoid adding latency to legitimate
   keyboard opens.

4. **Verify no consumer regressed.** Confirm the quantity and upholstery sheets still open, type,
   lift, and now close cleanly.

## Risks and mitigations

- Risk: Diagnosis is code-derived, not reproduced (no soft keyboard in CI); a single guard may not
  fully fix it.
  Mitigation: The guards are complementary and cover every identified path; validate on-device and
  keep whichever layers are needed. Start with Steps 1+2 (root), add Step 3/3b only if the flash
  persists.
- Risk: `onCloseAutoFocus` prevention removes focus-return-to-trigger, a minor a11y regression.
  Mitigation: Acceptable for a touch PWA; revisit if keyboard-navigation users are affected.
- Risk: Over-eager blur in `handleClose` could dismiss a keyboard the user did not intend to lose.
  Mitigation: `handleClose` only runs when the sheet is actually closing, where dismissing the
  keyboard is the desired outcome.
- Risk: Provider debounce (3b) could delay legitimate keyboard opens.
  Mitigation: Only apply if Step 3 is insufficient; keep the debounce window small and on the
  boolean only.

## Validation plan

- Manual mobile (iOS Safari PWA standalone + Android Chrome) — primary gate and bisection:
  - Quantity sheet from `TaskDetailSlidePage`: open → focus input (keyboard up) → dismiss keyboard
    → close sheet via button, backdrop, and drag handle → **no flash, no upward jump** each time.
  - Upholstery "Edit amount": use the keyboard, then close → no flash.
  - Sheet without ever opening the keyboard: closes exactly as before.
  - Keyboard open/type/lift behavior unchanged.
- `npm run typecheck`: zero errors.
- `npx playwright test --grep keyboard --project=desktop`: no regression to sheet open/close
  (headless cannot exercise the soft keyboard; documented limitation).

## Review log

- `2026-06-15` `Claude`: Authored after the lift hotfix fixed keyboard-open but a close-time
  keyboard flash remained when the keyboard had been used. Diagnosed as focus re-applied to the
  in-sheet input during Vaul/Radix close; fix makes the close sequence focus-safe.
- `2026-06-15` `Codex`: Implemented close-time autofocus prevention, active editable blur,
  and guarded floating-bar autofocus; `npm run typecheck` passed; summary and archive record
  written.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
