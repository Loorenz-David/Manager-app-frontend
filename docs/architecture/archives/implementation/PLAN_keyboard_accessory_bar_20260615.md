# PLAN_keyboard_accessory_bar_20260615

## Metadata

- Plan ID: `PLAN_keyboard_accessory_bar_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T12:31:32Z`
- Related issue/ticket: `n/a — form keyboard-ergonomics test`
- Intention plan: `n/a`

## Goal and intent

- Goal: Make filling the **Customer** staged step of the pre-order creation form comfortable while
  the software keyboard is open. While any text field in that step is focused, a thin toolbar
  floats directly above the keyboard with two actions: **Clear** (left) empties the current field,
  **Next** (right) moves focus to the next text field in the step; on the last field it reads
  **Done** and closes the keyboard.
- Business/user intent: Evaluate whether the keyboard-aware system supports ergonomic multi-field
  form entry on phones (sequential field navigation without dismissing the keyboard). The real
  fields stay in the form (kept visible above the keyboard by the surface); only the accessory
  toolbar floats — the "accessory toolbar" model chosen by David on 2026-06-15.
- Non-goals:
  - No change to keyboard math, `--keyboard-inset`, `KeyboardInsetProvider`, or the lift/close-focus
    behavior delivered earlier.
  - No mirroring of inputs into the floating bar; no refactor of the customer fields from
    `register` to controlled.
  - No query/action/domain contract changes — UI/layout layer only.
  - Do not apply this to other steps (Task, Assignment, Details) or other forms in this plan.

## Scope

- In scope:
  1. New **shared** primitive `KeyboardAccessoryBar` in `@beyo/ui` (per contract 37: the floating
     bar lives in shared chrome, never in a page). It wraps a form region and renders one floating
     toolbar above the keyboard that operates on the focused text input within that region.
  2. Keyboard-inset on the shared `StagedForm` scroll container (contract 37 "Case B"): the staged
     form owns its own `overflow-y-auto` container, which must account for `--keyboard-inset` so a
     focused field is not hidden behind the keyboard or the accessory toolbar.
  3. Wire the pre-order **Customer** step to `KeyboardAccessoryBar`.
- Out of scope:
  - Mirroring inputs above the keyboard (rejected design).
  - Applying the bar to the phone country picker, type/fulfillment/date pickers (they are buttons,
    not text inputs, and are skipped automatically).
  - A contract doc update for the new primitive (tracked as a follow-up note, not built here).
- Assumptions:
  - `KeyboardInsetProvider` is mounted at the app root (already true) — the bar depends on it.
  - Pre-order is a `slide` surface (confirmed in `task-creation/surfaces.ts`).
  - Inactive `StagedFormStep`s are unmounted (confirmed — `getActiveStepChild` renders only the
    active step), so only the Customer step's inputs are in the DOM while it is active.
  - Customer text fields render native `<input>` via `TextInput` (`forwardRef`, confirmed).

## Clarifications required

- [x] ~~Floating model: mirror vs accessory toolbar.~~ **Resolved (David, 2026-06-15): accessory
  toolbar — real fields stay in the form, only Clear/Next float.**
- [x] ~~Where the coordination logic lives.~~ **Resolved (David, 2026-06-15): shared primitive in
  `@beyo/ui`.**

## Acceptance criteria

1. On the pre-order Customer step, focusing any text field (name, email, phone number, street,
   city, postal code, country) shows a toolbar pinned directly above the keyboard with **Clear**
   (left) and **Next** (right).
2. **Next** moves focus to the next text field in document order and keeps the keyboard open; the
   newly focused field scrolls into view above the keyboard and toolbar.
3. On the last text field the right button reads **Done** and tapping it closes the keyboard.
4. **Clear** empties the currently focused field, the form state updates (React Hook Form reflects
   the empty value and re-validates as usual), and the keyboard stays open with focus retained.
5. Picker fields (customer type, fulfillment method, delivery date) and the phone country-picker
   button are skipped by **Next** — only text inputs participate.
6. A focused field in the staged form is never hidden behind the keyboard or the toolbar.
7. The bar adds no behavior when the keyboard is closed (normal form), and nothing floats then.
8. `npm run typecheck`: zero errors across the changed packages and apps.

## Contracts and skills

### Domain schemas consulted

- `src/features/customers/types.ts`: customer fields are `display_name`, `primary_email`,
  `primary_phone_number`, and `address.{street, city, postal_code, country}` (all strings).
- `features/task-creation/types.ts` (`PreOrderFormValues`): the Customer step binds
  `customer.display_name`, `customer.primary_email`, `customer.primary_phone_number`,
  `customer.address.*`. Use these exact paths — do not invent names.

### Selected contracts

- `architecture/37_keyboard_aware_inputs.md`: the keyboard-aware system; the new bar extends it
  (shared primitive, `bottom: var(--keyboard-inset)`, portal, `preventFocusSteal`) and the "Case B"
  custom-scroll-container rule applies to `StagedForm`.
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: slide-surface chrome vs.
  feature content (active surface types `slide`, `sheet`, `modal`).
- `architecture/09_forms.md`: React Hook Form integration — clearing a field must update RHF state
  and validation the same way a user edit does.
- `architecture/07_components.md`: the Customer step is a feature component composing the shared
  primitive; it consumes form context only.
- `architecture/35_shared_packages.md`: why the primitive belongs in `@beyo/ui`, not the app.

### Added from guide

- `architecture/37_keyboard_aware_inputs.md`: trigger — "keyboard", "input above keyboard",
  "FloatingKeyboardBar", "useKeyboardInset".
- `architecture/09_forms.md`: trigger — "form", "useForm", "field error".

### Excluded contracts

- `architecture/33_vaul_drawer.md`: pre-order is a slide surface; no Vaul drawer here.
- `architecture/24_dto.md`, `05_server_state.md`, `08_hooks.md`: no data layer touched.

### Read order block

- `architecture/28_surfaces.md` (baseline) → `architecture/28_surfaces_local.md` (app delta:
  `slide` surface type).
- Applied precedence: local extension overrides baseline only for this app.

### File read intent — pattern vs. relational

- Relational reads permitted: `FloatingKeyboardBar.tsx` (reuse positioning/portal/`preventFocusSteal`),
  `KeyboardInsetProvider.tsx` (consume `useKeyboardInset`), `StagedForm.tsx` (locate the scroll
  container), the customer field components and `TextInput` (confirm native inputs), `PreOrderFormContent.tsx`
  (integration point).
- No pattern reads of unrelated action/query/controller files.

### Skill selection

- Primary skill: none (UI primitive + feature wiring).
- Trigger terms: `keyboard, accessory bar, floating toolbar, next field, clear field, staged form`.

## Implementation plan

1. **New shared primitive — `KeyboardAccessoryBar` (`@beyo/ui`).**
   File: `packages/ui/src/components/primitives/keyboard-accessory-bar/KeyboardAccessoryBar.tsx`
   (+ `index.ts`, + export via `packages/ui/src/index.ts`).
   - Props: `{ children: ReactNode; clearLabel?: string; nextLabel?: string; doneLabel?: string;
     className?: string }`. Defaults: `Clear`, `Next`, `Done`.
   - Renders `children` inside a wrapper `div` with a `containerRef`.
   - Reads `isKeyboardOpen` from `useKeyboardInset()`.
   - **Active field tracking:** attach `focusin`/`focusout` listeners on `containerRef`. The active
     field is `document.activeElement` when it is an eligible text input inside the container.
   - **Eligible field test:** a visible (`offsetParent !== null`), non-disabled, non-readonly
     `<textarea>` or `<input>` whose `type` is one of `text, email, tel, url, search, number,
     password` (exclude `hidden, checkbox, radio, button, submit, file`).
   - **Toolbar render:** when `isKeyboardOpen && activeField`, `createPortal` to `document.body` a
     fixed container pinned at `bottom: var(--keyboard-inset)` (reuse `FloatingKeyboardBar`'s
     positioning: `pointer-events` handling, `z-[9999]`, top border, `pb-[calc(var(--safe-bottom)_+_…)]`).
     Inside: a row with the **Clear** button (left) and the **Next/Done** button (right). Both use
     `onMouseDown={preventFocusSteal}` so tapping them does not blur the field.
   - **Clear:** set the active input's value to `""` using the native value setter
     (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "")`,
     and the `HTMLTextAreaElement` equivalent) then `input.dispatchEvent(new Event("input", { bubbles: true }))`
     so React Hook Form's `register` onChange fires. Keep focus on the field.
   - **Next/Done:** query eligible fields within `containerRef` in document order, find the active
     field's index. If a next field exists → `next.focus()` then `next.scrollIntoView({ block: "center" })`.
     If it is the last → `activeField.blur()` (closes the keyboard). The button label is `doneLabel`
     when the active field is last, else `nextLabel`.
   - **Keep field visible:** on `focusin` (and after Next) call
     `activeField.scrollIntoView({ block: "center" })` so the field clears the toolbar + keyboard.
   - Re-export `preventFocusSteal` usage from the existing floating-bar module rather than
     redefining it.

2. **Case B — keyboard inset on `StagedForm` scroll container (`@beyo/ui`).**
   In `packages/ui/src/components/primitives/staged-form/StagedForm.tsx`, add
   `pb-[calc(var(--safe-bottom)_+_var(--keyboard-inset))]` to the `flex-1 overflow-y-auto` step
   scroll container so focused fields are not occluded by the keyboard (benefits every staged form).
   The `scrollIntoView` in Step 1 handles clearing the toolbar height on top of that.

3. **Wire the pre-order Customer step.**
   In `apps/managers-app/.../features/task-creation/components/PreOrderFormContent.tsx`, wrap the
   Customer `StagedFormStep`'s content (the three `ContentCard`s with the customer fields) in
   `<KeyboardAccessoryBar>`. No changes to the customer field components. Add `data-testid`s to the
   Clear and Next/Done buttons (e.g. `keyboard-accessory-clear`, `keyboard-accessory-next`) per the
   testing convention.

4. **Verify** types and that no other consumer of `StagedForm` regresses from the padding change.

5. **Follow-up note (not built here):** add a "multi-field accessory toolbar" subsection to
   `architecture/37_keyboard_aware_inputs.md` documenting `KeyboardAccessoryBar` once this test is
   validated on-device. Capture as a TODO in the summary.

## Risks and mitigations

- Risk: Clearing via native value setter + dispatched `input` event does not update React Hook Form.
  Mitigation: This is the established RHF-compatible pattern for uncontrolled `register` inputs;
  validate that the field shows empty and re-validates. If a field uses a controlled wrapper, fall
  back to focusing and selecting-all + `delete` is **not** acceptable — instead expose an optional
  `onClear(activeField)` prop for that field. (Not needed for the current text fields.)
- Risk: The accessory toolbar covers the focused field (toolbar sits above the keyboard, adding
  height the inset does not know about).
  Mitigation: `scrollIntoView({ block: "center" })` on focus and on Next keeps the field centered in
  the remaining space; the `StagedForm` keyboard inset (Step 2) reserves keyboard height.
- Risk: Programmatic `focus()` on Next drops the keyboard on iOS.
  Mitigation: `preventFocusSteal` on the button (no blur of the current field before click) plus
  synchronous focus of the next input keeps the keyboard up — same technique the floating bar uses.
- Risk: Auto-discovery selects an unintended input (e.g. a hidden or search input).
  Mitigation: the eligibility filter (visible, enabled, editable, text-like type) excludes them;
  validate the traversal order on the Customer step specifically.
- Risk: Diagnosis/UX cannot be exercised headlessly (no soft keyboard in CI).
  Mitigation: gate acceptance on manual mobile validation (iOS Safari PWA + Android Chrome); keep
  `npm run typecheck` as the automated gate.

## Validation plan

- `npm run typecheck`: zero errors (managers + `@beyo/ui`).
- Manual mobile (iOS Safari PWA standalone + Android Chrome):
  - Open pre-order creation → Customer step → tap **Name** → toolbar appears above keyboard →
    **Next** walks Name → Email → Phone → Street → City → Postal code → Country, keyboard staying
    open, each field scrolling into view → **Done** on Country closes the keyboard.
  - **Clear** on a populated field empties it and keeps the keyboard open.
  - Picker fields are skipped by Next; closing the keyboard restores the normal form with no
    leftover floating UI.
- `npx playwright test --grep pre-order --project=desktop`: no regression to the form open/submit
  flow (headless cannot exercise the soft keyboard; documented limitation).

## Review log

- `2026-06-15` `David`: Chose the accessory-toolbar model and a shared `@beyo/ui` primitive.
- `2026-06-15` `Claude`: Authored; confirmed slide surface, unmounted inactive steps, native
  `TextInput`, and the `StagedForm` custom scroll container (Case B).

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
