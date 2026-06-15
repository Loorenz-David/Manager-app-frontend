# PLAN_staged_form_keyboard_accessory_20260615

## Metadata

- Plan ID: `PLAN_staged_form_keyboard_accessory_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T14:18:45Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_accessory_bar_20260615.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_keyboard_accessory_bar_20260615.md`

## Goal and intent

- Goal: Make the keyboard accessory toolbar (`Clear` / `Next` / `Done` field navigation) a
  **per-form opt-in** capability of `StagedForm`, so any staged form enables comfortable
  keyboard entry with a single prop. Fold in the minor `KeyboardAccessoryBar` improvements found in
  review, and document the pattern in contract `37`.
- Business/user intent: The accessory bar validated well on the pre-order Customer step. The user
  wants it standardized across staged forms without re-wrapping each step by hand, while keeping it
  opt-in (not forced on every form).
- Non-goals:
  - No default-on behavior — forms must opt in explicitly.
  - No merge of `KeyboardAccessoryBar` and `FloatingKeyboardBar` into one component (they are
    distinct patterns; only shared internals may be factored out).
  - No change to keyboard math, `--keyboard-inset`, `KeyboardInsetProvider`, or the lift/close-focus
    behavior.
  - No query/action/domain contract changes — UI/layout layer only.

## Scope

- In scope:
  1. Add `enableKeyboardAccessory?: boolean` (default `false`) to `StagedForm` (both the
     manager-local copy that pre-order uses **and** the shared `@beyo/ui` copy, plus their
     `staged-form.types.ts`). When `true`, `StagedForm` wraps its active-step content in
     `KeyboardAccessoryBar`, so navigation spans the **current step's** text fields.
  2. Migrate `PreOrderFormContent` to the prop: set `enableKeyboardAccessory` on `StagedForm` and
     remove the manual `KeyboardAccessoryBar` wrapper around the Customer step. (This extends the
     accessory to every pre-order step that has text fields — intended.)
  3. Fold in the `KeyboardAccessoryBar` improvements from review (below).
  4. Document the pattern in `architecture/37_keyboard_aware_inputs.md`: a `KeyboardAccessoryBar`
     subsection, the `StagedForm` opt-in, and a "which primitive" decision table vs.
     `FloatingKeyboardBar`.
- Out of scope:
  - Per-step opt-out, label/style customization props, or making `Done` advance the staged step
    (possible future enhancements; note only).
  - Converging the local/shared `StagedForm` duplication (apply to both; full convergence is a
    separate cleanup).
- Assumptions:
  - Managers renders the **local** `StagedForm` (`@/components/primitives`); the shared `@beyo/ui`
    copy is kept in parity for other apps.
  - `KeyboardAccessoryBar` only renders its toolbar when an eligible field inside its container is
    focused, so it is safe to mount once per form regardless of which step is active.
  - Only the active `StagedFormStep` is mounted (confirmed), so field navigation never crosses step
    boundaries.

## Clarifications required

- [x] ~~Opt-in per form vs default-on for every staged form.~~ **Resolved (David, 2026-06-15):
  opt-in per form via a `StagedForm` prop.**

## Acceptance criteria

1. A staged form with `enableKeyboardAccessory` shows the `Clear` / `Next` (or `Done`) toolbar above
   the keyboard whenever a text field in the active step is focused; a staged form without the prop
   behaves exactly as before (no toolbar).
2. `Next` walks the active step's text fields in DOM order, keeping the keyboard open and scrolling
   each into view; `Done` on the last field closes the keyboard. `Clear` empties the focused field
   (React Hook Form updates) and keeps the keyboard open.
3. Step transition animations (`AnimatePresence`) and existing `StagedForm` behavior (timeline,
   scroll fade, navigation/footer) are unchanged when the prop is enabled.
4. Pre-order creation uses the prop (no manual `KeyboardAccessoryBar` in `PreOrderFormContent`); the
   Customer step works as before and other steps with text fields now also get the toolbar.
5. The toolbar never renders when the keyboard is closed or when focus is on a picker/button.
6. `npm run typecheck`: zero errors across changed packages and apps.

## Contracts and skills

### Selected contracts

- `architecture/37_keyboard_aware_inputs.md`: home of the keyboard-aware system; this plan extends
  it (`KeyboardAccessoryBar` + `StagedForm` opt-in) and updates the contract doc.
- `architecture/07_components.md`: `StagedForm` composes the shared primitive; feature forms opt in
  via prop only.
- `architecture/35_shared_packages.md`: `KeyboardAccessoryBar` stays in `@beyo/ui`; `StagedForm`
  imports it.
- `architecture/09_forms.md`: clearing a field must update RHF state/validation like a user edit
  (already handled by the primitive).
- `architecture/28_surfaces.md` + `_local.md`: keyboard-aware chrome stays in shared primitives.

### Excluded contracts

- `architecture/33_vaul_drawer.md`, `24_dto.md`, `05_server_state.md`, `08_hooks.md`: no drawer,
  data, or hook-layer work.

### File read intent — pattern vs. relational

- Relational reads permitted: `KeyboardAccessoryBar.tsx` (apply improvements),
  `StagedForm.tsx` + `staged-form.types.ts` (local and shared, integration point),
  `PreOrderFormContent.tsx` (migrate), `FloatingKeyboardBar.tsx` (only if extracting shared
  positioning helper).
- No pattern reads of unrelated action/query/controller files.

### Skill selection

- Primary skill: none (UI primitive + staged-form integration + contract doc).
- Trigger terms: `keyboard accessory, staged form, next field, clear field`.

## Implementation plan

1. **Add the opt-in prop to `StagedForm` types.** In both
   `apps/managers-app/.../components/primitives/staged-form/staged-form.types.ts` and
   `packages/ui/src/components/primitives/staged-form/staged-form.types.ts`, add
   `enableKeyboardAccessory?: boolean;` to `StagedFormProps`.

2. **Wrap the active-step content when enabled — without breaking animation.** In both `StagedForm`
   components, wrap the **`AnimatePresence` block** (not the step child) in `KeyboardAccessoryBar`
   when `enableKeyboardAccessory` is true:

   ```tsx
   const stepContent = (
     <AnimatePresence custom={direction} mode="wait">
       {getActiveStepChild(children, activeStepId)}
     </AnimatePresence>
   );

   // inside the scroll container, after the sticky fade:
   {enableKeyboardAccessory ? (
     <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar>
   ) : (
     stepContent
   )}
   ```

   Wrapping around `AnimatePresence` keeps step exit/enter animations intact and keeps the
   accessory bar's container spanning whichever step is mounted. Import `KeyboardAccessoryBar` from
   `@beyo/ui` (shared copy) / the managers primitives barrel (local copy).

3. **Migrate pre-order.** In `PreOrderFormContent.tsx`, remove the manual
   `<KeyboardAccessoryBar>` wrapper around the Customer step and instead pass
   `enableKeyboardAccessory` to `<StagedForm>`. Drop the now-unused import.

4. **Fold in `KeyboardAccessoryBar` review improvements** (`packages/ui/.../KeyboardAccessoryBar.tsx`):
   - Compute "has next field" / the action label inside `refreshActiveField` / `handleAdvance` and
     store in state, instead of running `querySelectorAll` during render.
   - Coerce `shouldShowBar` to a real boolean (`Boolean(isKeyboardOpen && activeField)`).
   - Guard against a detached active field (`activeField?.isConnected`) when deciding to show.
   - Add `role="toolbar"` and an `aria-label` to the toolbar container.

5. **(Optional) Extract shared positioning internals.** If low-risk, factor the portal +
   `bottom: var(--keyboard-inset)` + safe-area + pointer-events shell shared by `FloatingKeyboardBar`
   and `KeyboardAccessoryBar` into one private helper in the floating-keyboard module, so the two
   primitives cannot drift. Keep both public APIs unchanged. Skip if it risks regressing either.

6. **Update contract `37_keyboard_aware_inputs.md`.** Add: a `KeyboardAccessoryBar` subsection
   (what it is, the wrap-a-region model, that it is multi-instance-safe), the `StagedForm`
   `enableKeyboardAccessory` opt-in, and a decision table — single input + custom controls →
   `FloatingKeyboardBar`; multi-field navigation → `KeyboardAccessoryBar`.

7. **Verify** types and that staged forms without the prop are byte-for-byte unchanged in behavior.

## Risks and mitigations

- Risk: Wrapping the step child (instead of the `AnimatePresence` block) breaks step transitions.
  Mitigation: Step 2 wraps around `AnimatePresence`; verify the timeline/step animation still runs.
- Risk: The extra wrapper `div` from `KeyboardAccessoryBar` perturbs staged-form layout.
  Mitigation: it is a transparent full-width block element inside the existing scroll container;
  verify spacing on a step visually. If needed, the wrapper can use `display: contents`.
- Risk: Local/shared `StagedForm` drift (only the local copy is used by managers).
  Mitigation: apply the prop to both copies and their types in this plan; note full convergence as
  a separate follow-up.
- Risk: Enabling pre-order form-wide changes other steps (Task inputs, Details textarea now get the
  bar).
  Mitigation: intended per the opt-in decision; call out in the summary and validate those steps.
- Risk: On-device keyboard behavior cannot be exercised headlessly.
  Mitigation: gate acceptance on manual mobile validation; `npm run typecheck` is the automated gate.

## Validation plan

- `npm run typecheck`: zero errors (managers + `@beyo/ui`).
- Manual mobile (iOS Safari PWA standalone + Android Chrome):
  - Pre-order creation with the prop: Customer step behaves as before; Task and Details steps now
    show the toolbar on their text fields; `Next`/`Done`/`Clear` behave per criteria; step
    transitions animate normally.
  - A staged form **without** the prop (e.g. leave one as-is) shows no toolbar — confirms opt-in.
- `npx playwright test --grep pre-order --project=desktop`: no regression to form open/submit
  (headless cannot exercise the soft keyboard; documented limitation).

## Review log

- `2026-06-15` `David`: Chose per-form opt-in via a `StagedForm` prop.
- `2026-06-15` `Claude`: Authored; confirmed the `AnimatePresence` wrap point, the local/shared
  `StagedForm` split, and folded in the `KeyboardAccessoryBar` review improvements + contract doc.

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
