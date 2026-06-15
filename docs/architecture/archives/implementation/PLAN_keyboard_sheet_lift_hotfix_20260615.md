# PLAN_keyboard_sheet_lift_hotfix_20260615

## Metadata

- Plan ID: `PLAN_keyboard_sheet_lift_hotfix_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T10:59:08Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_aware_inputs_20260615.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_keyboard_aware_inputs_20260615.md`

## Goal and intent

- Goal: Fix the regression where tapping a text input inside a bottom sheet shows the software
  keyboard for a few hundred ms and then dismisses it before the user can type. Restore reliable
  typing in every `BottomSheetSurface` (reproduced via the quantity sheet opened from
  `TaskDetailSlidePage`).
- Business/user intent: The keyboard-aware rollout disabled Vaul's input repositioning to fix a
  layout-corruption bug, but did not replace the part of that behavior that physically lifted the
  fixed sheet above the keyboard. As a result, plain-input bottom sheets are currently unusable
  on phones. This hotfix is scoped to land and be verified on a real device **before** the larger
  keyboard-aware cleanup (`PLAN_keyboard_aware_inputs_corrections_20260615`).
- Non-goals:
  - No surface centralization, no primitive API change, no validation-gate work — those stay in
    the corrections plan.
  - No change to the keyboard-height math, the `--keyboard-inset` mechanism, or
    `repositionInputs={false}` (which is correct and stays).
  - No query/action/domain contract changes — UI/layout layer only.

## Scope

- In scope:
  1. **Lift the bottom sheet above the keyboard** — offset `Drawer.Content` upward by
     `--keyboard-inset` so the sheet and its input clear the keyboard, replacing the scroll-area
     padding approach for this surface.
  2. **Remove the root re-render storm** — stop `KeyboardInsetProvider` from re-rendering the app
     subtree on every viewport frame, so the lift animates smoothly and focus is not disturbed.
- Out of scope:
  - `SlidePageSurface`, `ModalSurface`, the main app shell, surface centralization,
    `FloatingKeyboardBar` API changes, the typecheck gate — all deferred to the corrections plan.
- Assumptions:
  - The keyboard-aware system lives in shared packages and apps import it (prior decision).
  - The single observed cause is the missing lift; Step 2 covers the most likely contributing
    factor (re-render storm). Both are validated on-device in the same change.

## Root cause (from code analysis)

- `BottomSheetSurface` renders `Drawer.Content` as `position: fixed; bottom: 0; max-h-[90dvh]`.
- Vaul's `repositionInputs` (now disabled) used to lift that fixed sheet above the keyboard via
  `onVisualViewportChange`. Verified in `node_modules/vaul/dist/index.js`: that viewport handler
  is gated only on `repositionInputs`; Vaul's other iOS focus machinery was already inert here
  because the sheet uses `modal={false}`. So disabling `repositionInputs` specifically removed
  the lift.
- The predecessor plan replaced it with `pb-[…var(--keyboard-inset)]` on the scroll area, but
  padding does not move a bottom-anchored sheet — an input near the top of the sheet stays put.
- When the visual viewport shrinks, the focused input ends up behind the keyboard; iOS cannot
  scroll a `position: fixed` element into view and dismisses the keyboard → the observed flash.
- `KeyboardInsetProvider` additionally `setState`s on every `visualViewport` frame, re-rendering
  the whole app subtree (including the surface stack) during the keyboard animation, which adds
  jank and may compound the dismissal.

## Clarifications required

_None — scope is self-contained; diagnosis to be confirmed on-device per the validation plan._

## Acceptance criteria

1. Tapping the quantity input in the bottom sheet opened from `TaskDetailSlidePage` opens the
   keyboard and it **stays open**; the user can type a value.
2. The sheet is lifted so the focused input sits above the keyboard; on dismiss the sheet returns
   to `bottom: 0` with no leftover inline `height`/`bottom` on `[data-vaul-drawer]`.
3. The behavior holds for any plain input in any bottom sheet, in both managers and workers.
4. Drag-to-dismiss (the Vaul handle) still works while/after the lift.
5. The upholstery amount sheet (floating-bar consumer) still works and is not regressed.
6. `npm run typecheck` (managers workspace, current gate): zero errors.

## Contracts and skills

### Contracts loaded

- `Frontend_architecture/28_surfaces.md`: the lift belongs in the shared surface chrome, not in
  feature content; this change stays inside `BottomSheetSurface`.
- `Frontend_architecture/23_providers.md`: `KeyboardInsetProvider` keeps exporting only its
  Provider + consumer hook; Step 2 changes its internals, not its public shape.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Relational reads permitted: `BottomSheetSurface.tsx`, `KeyboardInsetProvider.tsx`,
  `use-visual-viewport.ts`, and the quantity/upholstery sheet pages (to confirm no regression).
- No pattern reads required — no new data-layer code.

### Skill selection

- Primary skill: none (surface chrome + provider internals).
- Trigger terms: `keyboard, visualViewport, vaul, bottom sheet, lift`.

## Implementation plan

1. **Lift `Drawer.Content` by the keyboard inset.** In
   `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`:
   - Change `Drawer.Content` from `bottom-0` to an offset of `var(--keyboard-inset)` (e.g.
     `style={{ bottom: "var(--keyboard-inset)" }}` or a `bottom-[var(--keyboard-inset)]` class),
     so the whole sheet rises above the keyboard. Keep `max-h-[90dvh]`.
   - Add a short transition on `bottom` so the lift tracks the keyboard without jumping.
   - Remove the now-redundant `var(--keyboard-inset)` term from the scroll area padding, leaving
     `pb-[var(--safe-bottom)]` (the lift, not padding, is what clears the keyboard here).
   - Confirm the lift composes with Vaul's drag `transform` (different properties; they should not
     conflict) and that drag-to-dismiss still works.

2. **Stop the per-frame re-render in `KeyboardInsetProvider`.** In
   `packages/ui/src/providers/KeyboardInsetProvider.tsx`:
   - Write the continuously-changing keyboard height **imperatively** to
     `--keyboard-inset` on `document.documentElement` (a subscription/side effect), not through
     React state.
   - Have the context expose only the low-frequency `isKeyboardOpen` boolean (flips at most twice
     per interaction). Layout stays reactive through the CSS var; the app subtree no longer
     re-renders on every viewport frame.
   - `useVisualViewport` may retain its existing state API for other callers; only the provider's
     use of `keyboardHeight` as React state changes.

3. **Verify no consumer regressed.** Confirm the upholstery `FloatingKeyboardBar` consumer (which
   reads `isKeyboardOpen` and positions at `bottom: var(--keyboard-inset)`) still works with the
   provider now driving the var imperatively.

## Risks and mitigations

- Risk: The diagnosis is code-derived, not reproduced (no soft keyboard in headless browsers); the
  lift may not be the complete fix.
  Mitigation: Step 2 removes the most likely contributing factor in the same change; validate on a
  real phone before closing the plan.
- Risk: `bottom: var(--keyboard-inset)` on `Drawer.Content` fights Vaul's drag transform.
  Mitigation: Vaul drags via `transform: translate3d`; the lift uses `bottom` — they compose.
  Explicitly retest drag-to-dismiss.
- Risk: Imperative CSS-var writes race with React render order for first paint.
  Mitigation: Initialize the var to `0px` (already declared in `@beyo/styles`) and write on the
  viewport subscription; the floating consumer already tolerates a one-frame settle.

## Validation plan

- Manual mobile (iOS Safari PWA standalone + Android Chrome) — primary gate:
  - `TaskDetailSlidePage` → open quantity sheet → tap quantity input → keyboard opens and stays
    open, sheet lifted above it, value typable → dismiss → sheet back to `bottom: 0`, no stale
    inline styles → drag-to-dismiss still works.
  - Upholstery "Edit amount" → floating bar still appears and works; no regression.
- `npm run typecheck`: zero errors.
- `npx playwright test --grep keyboard --project=desktop`: no regression to sheet open/close
  (headless cannot exercise the soft keyboard; documented limitation).

## Review log

- `2026-06-15` `Claude`: Split out of `PLAN_keyboard_aware_inputs_corrections_20260615` (Step 0)
  as an independently landable/verifiable hotfix for the keyboard-dismiss regression.
- `2026-06-15` `Codex`: Implemented the shared bottom-sheet keyboard lift and provider
  per-frame render reduction; `npm run typecheck` passed; summary and archive record written.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
