# PLAN_searchable_select_input_corrections_20260713

## Metadata

- Plan ID: `PLAN_searchable_select_input_corrections_20260713`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-13T00:00:00Z`
- Last updated at (UTC): `2026-07-13T10:16:21Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_searchable_select_input_20260713.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_20260713.md`
- Related contract (updated by this plan): `architecture/37_keyboard_aware_inputs.md`

## Goal and intent

- Goal: Close the gaps found in the post-implementation review of `PLAN_searchable_select_input_20260713`, plus one additional, more severe bug found immediately after through hands-on UI testing — the panel's focus-transfer fires one render too early and never retries, so the floating input never actually receives focus, the software keyboard closes itself moments after opening, and the panel presentation is currently unusable end-to-end. Also in scope: a duplicate-DOM-id accessibility bug, a missing form-submit guard under `forceSelection`, a duplicate heading in the canonical keyboard-aware-input contract, an undocumented new per-package test-tooling pattern, and test coverage that doesn't yet match what the predecessor plan itself required.
- Business/user intent: `SearchableSelectInput` and the `FloatingKeyboardBar` `variant="panel"` extension are shared infrastructure other features will build on next. The focus-transfer bug is a full functional break — a user can tap the field, see the keyboard and panel begin to appear, and never manage to type or select anything, every single time, on every device, since it isn't timing-dependent — reported directly by the user testing `packages/task-creation/src/components/InternalFormContent.tsx`. The other two correctness bugs are the kind of thing that looks fine in casual manual testing but breaks for real users — the ARIA id collision undermines screen-reader correctness in precisely the keyboard-panel scenario this whole feature exists for, and the missing `preventDefault` can silently submit a surrounding form. All three must be fixed before any feature adopts the primitive.
- Non-goals:
  - No change to the animation choreography, its timing, tokens, or the `clip-path` wipe mechanism — reviewed and confirmed correct.
  - No change to the `forceSelection` commit/revert semantics beyond the one missing `preventDefault` — the state machine itself (editing-invalidates-to-null, revert-and-renotify) is confirmed correct.
  - No Playwright spec — still no consuming feature exists to drive one against (unchanged from the predecessor plan's reasoning).
  - No further redesign of the scroll lock — it is correct as implemented.

## Scope

- In scope:
  1. **Fix the panel focus-transfer timing bug (highest priority — complete functional break).** `FloatingKeyboardBar` runs two `useLayoutEffect`s off `isKeyboardOpen`: one focuses `floatingInputRef.current`, the other measures the inline rect and calls `setIsPanelMounted(true)` (a state update, not yet committed). Both fire in the *same* render/commit where `isKeyboardOpen` just became `true`, but the floating `<input>` only exists in the DOM once `isPanelMounted` becomes `true` **on the following render** — so the focus call executes while `floatingInputRef.current` is still `null` and silently no-ops. Neither effect has `isPanelMounted` in its dependency array, so there is no retry. One render later, the inline copy's wrapper receives `aria-hidden="true"` while it still holds actual focus (since it was never transferred) — browsers force-blur an element inside a newly-`aria-hidden` subtree, which closes the software keyboard and collapses the whole takeover. Reproduced 100% of the time by the user against a real test consumer (`packages/task-creation/src/components/InternalFormContent.tsx`), not a rare race.
  2. **Fix the duplicate-DOM-id bug** — `FloatingKeyboardBar` must expose whether a given `renderControls` invocation is currently the hidden inline copy, so `SearchableSelectInput` can suppress its own popup in that copy instead of relying on `isOpen` alone (which is shared, undifferentiated state fed identically into both invocations).
  3. **Fix the missing `preventDefault` on `Enter` under `forceSelection` with no active option** — currently falls through to the browser default (form submit) instead of being swallowed.
  4. **Fix the duplicate `### Case C` heading** in `architecture/37_keyboard_aware_inputs.md` — the predecessor plan's own instruction ("a 'Case C — variant: panel' subsection") was ambiguous and the implementer added a second sibling `### Case C` instead of nesting under the existing one.
  5. **Formalize the new per-package Vitest pattern** — `packages/ui/vitest.config.ts` is the first per-package test config in the monorepo, added ad hoc because the predecessor plan's `npm run test -- --grep <X>` commands don't correspond to any real script (root `package.json` has no `"test"` script; every app uses `"test:unit"`). Document the pattern where package-level contracts live, and add a discoverable script so the next engineer doesn't have to read an archived summary to find the exact invocation.
  6. **Fill the test-coverage gap** the predecessor plan itself required but didn't ship: `FloatingKeyboardBar` `variant="panel"` mount/lifecycle coverage (including a regression test for fix 1 — the exact scenario that shipped broken), a reduced-motion assertion, and an integration test that the scroll lock actually engages when the panel mounts (not just the isolated hook test) — plus regression tests for fixes 2 and 3 above.
- Out of scope:
  - Any change to `packages/ui/package.json` dependencies — the fix does not require a new library.
  - Any change to apps or other packages — everything here is confined to `packages/ui` and one canonical contract file.
- Assumptions:
  - The focus-transfer fix requires a *second* focus-transfer trigger, not a relocation of the existing one: `variant="bar"` mounts its floating copy synchronously in the same render `isKeyboardOpen` flips (no intermediate state gate), so its existing `useLayoutEffect` keyed on `[isKeyboardOpen]` stays correct and must not be touched. The panel variant additionally needs a `useLayoutEffect` keyed on `[isPanelMounted]` that fires once the portal (and therefore the real floating `<input>` DOM node) has actually committed — this is the render that was previously missing a focus attempt entirely.
  - The duplicate-id fix belongs inside `FloatingKeyboardBar` (a new boolean on the `renderControls` callback args, mirroring the boolean it already computes internally for its own `invisible`/`aria-hidden` wrapper), not as a workaround inside `SearchableSelectInput` alone — any future `variant="panel"` consumer that renders its own overlay content in both copies would hit the identical bug, so the fix should be general-purpose infrastructure, matching this contract's existing "FloatingKeyboardBar owns the inline/floating duplication" principle.
  - Formalizing the Vitest pattern (item 4) is bundled into this corrections plan rather than split into its own plan, consistent with how the precedent correction plan for this same contract (`PLAN_keyboard_aware_inputs_corrections_20260615`) bundled a validation-gate widening alongside its correctness fixes. If this scope feels too broad once underway, it can be split out — flagged here rather than silently assumed.

## Clarifications required

None open — every finding and its fix were reviewed and are unambiguous engineering corrections, not product decisions.

## Acceptance criteria

1. Tapping the field on a real mobile viewport (or the RTL-level equivalent: keyboard-open simulation) results in the floating input actually holding focus once the panel finishes mounting — verified by asserting `document.activeElement === floatingInputRef.current` (or the equivalent visible/floating `<input>`) after the panel's `isPanelMounted` transition, not just that `.focus()` was *called*.
2. The inline copy's wrapper never receives `aria-hidden`/`invisible` while it still holds focus — focus must have already moved to the floating copy by the time that happens. No forced browser blur, no keyboard/panel closing itself after opening.
3. The end-to-end flow works without interruption: tap → keyboard opens → panel shows with the input focused and usable → type → list narrows → select or type freely, exactly as originally scoped and now confirmed by a real consuming component (`InternalFormContent.tsx`).
4. While the panel presentation is mounted (`isKeyboardOpen` true, `variant="panel"`), exactly one DOM element exists for the listbox id and for each option id — never two. Verified by asserting `document.querySelectorAll('#' + listboxId)` (and each option id) has length 1 while the panel is open.
5. The hidden inline copy renders no listbox/option content at all while the panel is mounted — it is not enough for the duplicate to be `aria-hidden`; it must not exist in the DOM.
6. `FloatingKeyboardBar`'s `renderControls` callback gains additive fields communicating the above (e.g. `isInlineHidden: boolean`) — additive to the existing `{ inputRef, preventFocusSteal, isFloating, panelProgress }` shape, so existing consumers destructuring a subset are unaffected.
7. Pressing `Enter` inside `SearchableSelectInput` with `forceSelection` true, no active option, and text that matches nothing calls `preventDefault()` and produces no `onValueChange` call and no default browser action (verified with a `<form onSubmit>` wrapper in the regression test — the form must not submit).
8. `architecture/37_keyboard_aware_inputs.md` contains exactly one heading per case letter; the panel-variant subsection is either renamed to the next free letter or nested under the existing `### Case C` as a sub-heading — reviewer's call in step 4 of the Implementation plan, but no duplicate top-level heading text remains.
9. A discoverable npm script (root-level or `packages/ui`-scoped) runs the `packages/ui` Vitest suite without requiring knowledge of the exact `npx vitest run --config packages/ui/vitest.config.ts` invocation; `35_shared_packages.md` and/or `17_testing.md` documents when and how a package may own its own Vitest config.
10. New tests exist and pass for: the focus-transfer fix (criteria 1-3 — this is the most important test in the whole plan, since it's the one that would have caught the worst bug before it shipped), `FloatingKeyboardBar` `variant="panel"` mount lifecycle more broadly (`renderControls` receives correct `isFloating`/`isInlineHidden` at each phase), the reduced-motion fallback (no spatial transform/clip-path when `useReducedMotion()` is true), the scroll lock actually engaging/releasing when the panel mounts/unmounts (integration, not just the isolated hook), and both remaining regression fixes (criteria 4-5 and 7).
11. All existing tests from the predecessor plan continue to pass unchanged (no regression to filtering, selection, keyboard nav, or the existing `forceSelection` revert/re-notify behavior).

## Contracts and skills

### Contracts loaded

- `architecture/37_keyboard_aware_inputs.md`: the contract being corrected — `FloatingKeyboardBar`'s ownership of the inline/floating duplication is exactly what requires the new `isInlineHidden` signal to live there, not in a consumer.
- `architecture/17_testing.md`: RTL query priorities and the test-layer scope guide the new regression tests; also the natural home for documenting per-package Vitest configs as a testing-layer concern.
- `architecture/35_shared_packages.md`: package philosophy ("no build step," `package.json`/`tsconfig.json` only) is the contract the new `vitest.config.ts` pattern sits just outside of — needs an explicit, deliberate amendment rather than a silent precedent.
- `architecture/02_types.md`: no-`any`, additive-field discipline for the `renderControls` callback shape change (extend the object type, never change existing field meanings).
- `architecture/07_components.md`: shared-UI-primitive rules unchanged; the fix stays props-only, no context introduced.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Read `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx` and `packages/ui/src/components/primitives/input/SearchableSelectInput.tsx` in full — relational, these are the exact files being corrected, not patterns to imitate elsewhere.
- Read `architecture/37_keyboard_aware_inputs.md`'s current heading structure (`grep -n "^### Case"`) — relational, confirms the duplicate before rewriting.
- Read root `package.json`, every app's `package.json` scripts, and confirmed no other package has a `vitest.config.ts` — relational, establishes there is no existing convention to imitate for item 4; this plan is defining one, not following one.

### Skill selection

- Primary skill: none — correction/bugfix plan, not a new-feature code-generation flow.
- Trigger terms: `keyboard`, `FloatingKeyboardBar` → `37_keyboard_aware_inputs.md`; `test`, `vitest` → `17_testing.md`.
- Excluded alternatives: none relevant.

## Implementation plan

1. **Fix the panel focus-transfer timing bug** (`packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`) — do this one first; every other fix in this plan is testable only once the panel is actually usable:
   - Leave the existing `useLayoutEffect(() => { ...; floatingInputRef.current?.focus(); }, [isKeyboardOpen])` untouched — it is correct for `variant="bar"`, where the floating copy mounts unconditionally and synchronously the moment `isKeyboardOpen` is true, with no intermediate `isPanelMounted` gate.
   - Add a **new** `useLayoutEffect` keyed on `[isPanelMounted]` (not `isKeyboardOpen`) that runs after the portal has actually committed:
     ```ts
     useLayoutEffect(() => {
       if (!isPanelMounted || !hadEditableFocusOnOpenRef.current) {
         return;
       }
       floatingInputRef.current?.focus();
     }, [isPanelMounted]);
     ```
     This fires on the render where `isPanelMounted` just became `true` — by which point `createPortal(...)` has already mounted the floating `<input>`, so `floatingInputRef.current` is a real, focusable DOM node.
   - Order matters for the `aria-hidden` timing bug specifically: this new effect must run and successfully call `.focus()` on the floating input **before** the render that applies `aria-hidden`/`invisible` to the inline wrapper is perceived as having a live focused descendant. Since `useLayoutEffect`s run synchronously before the browser paints, and this effect runs in the very commit where `isPanelMounted` (and thus the `aria-hidden` attribute) both become true together, confirm focus has actually moved by the time this commit paints — do not rely on a subsequent effect or a `requestAnimationFrame` delay, which would re-introduce the same one-frame gap this fix removes.
   - Do not remove or weaken `hadEditableFocusOnOpenRef` — it still correctly distinguishes "the keyboard opened because of this field" from "the keyboard happened to already be open for an unrelated reason."
   - Regression-test this exact scenario (see step 7) — this is the bug that shipped completely broken, so the test must simulate the full sequence: keyboard closed → focus real input → `isKeyboardOpen` flips true → `isPanelMounted` flips true one tick later → assert focus is on the floating input specifically, not merely that `document.activeElement` is non-null.

2. **Fix the duplicate-DOM-id bug in `FloatingKeyboardBar`** (`packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`):
   - Add `isInlineHidden: boolean` to the `renderControls` callback argument object (alongside `inputRef`, `preventFocusSteal`, `isFloating`, `panelProgress`).
   - For the inline call: pass `isInlineHidden: isPanelVariant && isPanelMounted` (true exactly when the wrapping div is currently `invisible`/`aria-hidden`, per the existing condition at the wrapper — reuse that same boolean, don't recompute it separately).
   - For the floating call: pass `isInlineHidden: false` always (it is never the hidden copy).
   - For the non-panel (`variant="bar"`) path: pass `isInlineHidden: false` for both calls — the bar variant's inline copy is always either the real visible field or an intentionally-invisible layout placeholder with no overlay content to worry about (existing consumers don't render popups from it), so this field is a no-op there. Confirm this by re-running the existing `FloatingKeyboardBar` `variant="bar"` test unchanged.

3. **Consume the new field in `SearchableSelectInput`** (`packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`):
   - Thread `isInlineHidden` through `SearchableSelectControlsProps` alongside the existing `isFloating`/`panelProgress`.
   - In `SearchableSelectControls`, change the anchored-popup render condition from `isOpen ? <AnchoredOptionList .../> : null` to `!isInlineHidden && isOpen ? <AnchoredOptionList .../> : null` — this is the entire fix: the hidden inline copy now renders no listbox at all, so its `listboxId`/`getOptionId(...)` never collide with the floating copy's.
   - Verify `aria-controls`/`aria-expanded` on the (hidden) inline `TextInput` are also suppressed when `isInlineHidden` (they should reflect "nothing to control" while hidden, since there is genuinely no listbox there anymore) — adjust `aria-expanded={!isInlineHidden && (isFloating || isOpen)}` and the matching `aria-controls` expression for consistency, even though the element is `aria-hidden` at the ancestor level (defense in depth, and correct regardless of ancestor `aria-hidden` — some assistive tech and all `getElementById`/`querySelector` based tooling do not honor `aria-hidden` on ancestors when resolving these attributes by id).

4. **Fix the missing `preventDefault` in `handleKeyDown`'s `"Enter"` case** (same file):
   - Change:
     ```ts
     if (activeOption) {
       event.preventDefault();
       commitOption(activeOption, isFloating);
     } else if (!forceSelection) {
       event.preventDefault();
       commitText(queryText);
     }
     ```
     to call `event.preventDefault()` unconditionally whenever there is no active option but the popup is meaningfully open/in a select context (i.e., add an `else if (forceSelection) { event.preventDefault(); }` branch, or restructure as `event.preventDefault(); if (activeOption) { commitOption(...) } else if (!forceSelection) { commitText(...) }` — preventing default unconditionally on Enter while this is an active combobox, then branching only the commit behavior). Prefer the unconditional-preventDefault restructuring — it is simpler and matches the intention doc's own framing ("Prevent accidental surrounding-form submission when Enter is selecting an option") without needing to special-case `forceSelection` twice.

5. **Fix the duplicate `### Case C` heading** (`architecture/37_keyboard_aware_inputs.md`):
   - Rename the new "`variant="panel"`: an input plus full-height takeover" section to `### Case E — variant="panel": an input plus full-height takeover` (the next free letter, since `A`-`D` are already used), OR nest it as `#### variant="panel"` directly under the existing `### Case C — an input that floats directly above the keyboard` heading if the reviewer judges it belongs there as a variant rather than a sibling case. Either is acceptable; duplicate top-level lettering is not.
   - Update the "Which primitive to use" table's row label if the case letter is referenced there (currently it isn't — the table already just says `FloatingKeyboardBar variant="panel"`, no letter — confirm no other cross-reference needs updating).
   - Also document the focus-transfer fix from step 1 in this same contract file — it's exactly the kind of implementation-affecting detail the doc already records for the existing `variant="bar"` focus-handoff logic, and a future reader extending this primitive needs to know both effects exist and why.

6. **Formalize the per-package Vitest pattern:**
   - Add a root `package.json` script, e.g. `"test:ui": "vitest run --config packages/ui/vitest.config.ts"`, so the exact invocation Codex used is discoverable without reading an archived summary.
   - Add a short section to `architecture/35_shared_packages.md` (or `17_testing.md` — pick whichever this plan's reviewer judges is the better home; `17_testing.md` is about testing layers in general, `35_shared_packages.md` is about what belongs in a package) stating: a package **may** own a `vitest.config.ts` + test files when its source is not otherwise reachable by any app's test config include glob (as was the case for `packages/ui`), that this does **not** require adding `devDependencies` to the package's own `package.json` (test tooling is resolved via workspace hoisting from an app that already depends on it, consistent with the "no devDependencies in packages" rule), and that a root or package-scoped npm script must be added alongside any new package-level config so it stays discoverable.
   - While there, note for the record that this newly-runnable config caused a **pre-existing, unrelated** test file (`packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts`, 4 tests) to execute for the first time — confirm those 4 tests still pass (they did, per the predecessor's validation evidence) and leave a one-line note in the review log; no action needed beyond confirming they're not newly broken.

7. **Tests** (Vitest + RTL, extending existing files):
   - `FloatingKeyboardBar.test.tsx`: **first and most important** — a regression test for the focus-transfer bug (step 1): mock `isKeyboardOpen` transitioning false→true, let the effects/renders settle, and assert `document.activeElement` is the floating input, not merely truthy. Also assert no console warning/error about `aria-hidden` on a focused descendant is emitted during the transition (jsdom/React may surface this; assert its absence as an extra signal the bug is actually fixed). Then the existing scope: a `variant="panel"` case asserting the panel portal mounts/unmounts on `isKeyboardOpen` toggling, and that `renderControls` receives `isInlineHidden: true` for the inline call and `isInlineHidden: false` for the floating call while the panel is mounted, and `isInlineHidden: false` for both while it is not.
   - Add a reduced-motion test: mock `useReducedMotion()` to return `true`, assert the rendered panel's `style` has no spatial `y` transform/clip-path movement (or that they resolve to the resting values) — matching acceptance criterion 12 from the predecessor plan, which shipped in code but never in tests.
   - Add a scroll-lock integration test: render `FloatingKeyboardBar variant="panel"` with the keyboard mocked open, assert `document.body.style.overflow === "hidden"` while mounted and restored after closing — not just the isolated `use-body-scroll-lock.test.tsx` hook test.
   - `SearchableSelectInput.test.tsx`: add the duplicate-id regression test (criteria 4-5) and the `forceSelection` + Enter + no-match + wrapping `<form>` regression test (criterion 7).

## Risks and mitigations

- Risk: the new `useLayoutEffect` keyed on `[isPanelMounted]` (step 1) could fire in unintended scenarios if `isPanelMounted` ever becomes `true` for a reason unrelated to a fresh keyboard-open transition (e.g., some future code path that mounts the panel without the field having been focused), stealing focus somewhere the user didn't ask for it.
  Mitigation: the effect is guarded by `hadEditableFocusOnOpenRef.current`, the same flag the existing `variant="bar"` effect already relies on to distinguish "this field caused the keyboard to open" from "the keyboard happened to already be open" — no new trust assumption, reusing an already-correct guard.
- Risk: fixing focus-transfer timing could interact with the scroll lock or the animation's `travelDistance` measurement in a way not anticipated (both are also gated by the `isKeyboardOpen`/`isPanelMounted` pair).
  Mitigation: this fix adds a new effect, it does not alter the existing measurement/scroll-lock effect or its dependency array — the two concerns (measuring/mounting vs. focusing) stay in separate effects, as they already were, just with the missing one added.
- Risk: Adding `isInlineHidden` changes `FloatingKeyboardBarProps`'s callback argument shape again, on top of the additive changes from the predecessor plan — repeated shape changes to a widely-used shared primitive increase the chance some consumer's destructuring assumptions break.
  Mitigation: purely additive (new field, existing fields unchanged); the existing `variant="bar"` regression test must still pass unmodified; TypeScript structural typing means any consumer destructuring a subset of the object is unaffected, as with the previous round of changes.
- Risk: Restructuring the `"Enter"` case's `preventDefault()` call could accidentally change behavior for the non-`forceSelection`, active-option path too if the restructuring isn't careful.
  Mitigation: the plan explicitly prefers "call `preventDefault()` unconditionally once, then branch only the commit logic" specifically to avoid duplicating the call across branches and risking a missed path a second time.
- Risk: Formalizing the Vitest pattern (step 5) is process/documentation work bundled into a bugfix plan, and could be seen as scope creep.
  Mitigation: flagged explicitly in Assumptions as a deliberate bundling choice, consistent with precedent (`PLAN_keyboard_aware_inputs_corrections_20260615` did the same); can be split into its own plan if the reviewer prefers a narrower corrections scope.

## Validation plan

- `npm run typecheck`: zero TypeScript errors, including the extended `FloatingKeyboardBarProps` shape.
- `npm run test:ui` (new script from step 5) or `npx vitest run --config packages/ui/vitest.config.ts`: all existing tests continue to pass, plus every new test from step 6.
- Manual/visual check (no Playwright yet, same reasoning as the predecessor plan): open the panel on a real mobile viewport, inspect the DOM via devtools to confirm only one element exists per listbox/option id while the panel is open.

## Review log

- `2026-07-13` `Claude`: Authored from the post-implementation review of `PLAN_searchable_select_input_20260713` — findings were the duplicate-DOM-id bug, the missing `preventDefault` under `forceSelection`, the duplicate `### Case C` heading, the undocumented new per-package Vitest pattern, and a test-coverage shortfall against the predecessor plan's own acceptance criteria.
- `2026-07-13` `User`: Reported, from hands-on testing against a real consumer (`packages/task-creation/src/components/InternalFormContent.tsx`), that tapping the field showed the keyboard and panel beginning to appear, then closing again before any interaction was possible — every time, not intermittently. Diagnosed as a focus-transfer timing bug: `FloatingKeyboardBar`'s focus effect and its panel-mount effect both key off `isKeyboardOpen` and run in the same commit, but the floating `<input>` doesn't exist in the DOM until `isPanelMounted` becomes `true` one render later — so the focus call always no-ops, and the inline copy gets `aria-hidden` while still actually focused, which browsers respond to by force-blurring it (closing the keyboard). Added as the plan's highest-priority fix — everything else in this plan is secondary to making the panel usable at all.
- `2026-07-13` `Codex`: Implemented the focus retry, `isInlineHidden` propagation and duplicate-id suppression, unconditional `forceSelection` Enter prevention, corrected contract heading/documentation, discoverable `test:ui` script, and regression coverage. `npm run test:ui` passed 5 files / 16 tests, including the pre-existing 4-test scroll-visibility file; `npm run typecheck` passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Claude`
