# PLAN_searchable_select_input_panel_dismiss_corrections_20260713

## Metadata

- Plan ID: `PLAN_searchable_select_input_panel_dismiss_corrections_20260713`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-13T00:00:00Z`
- Last updated at (UTC): `2026-07-13T10:41:01Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_searchable_select_input_corrections_20260713.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_corrections_20260713.md`
- Related contract: `architecture/37_keyboard_aware_inputs.md` (no content change expected — see Scope)

## Goal and intent

- Goal: this plan's scope grew beyond its original title during drafting. It now fixes **two** bugs found in back-to-back hands-on testing immediately after `PLAN_searchable_select_input_corrections_20260713` landed, ordered by severity:
  1. **(Highest priority) `FloatingKeyboardBar` reacts to a global signal without checking it owns the field that caused it.** `isKeyboardOpen` (from `useKeyboardInset()`) is a single app-wide boolean — it has no concept of *which* input opened the keyboard. Every mounted `FloatingKeyboardBar variant="panel"` instance independently watches that same flag and mounts its own panel whenever it becomes `true`, with no check that *its own* field is the one currently focused. In a real multi-field form (`packages/task-creation/src/components/InternalFormContent.tsx`), tapping any *other* input after having used the `SearchableSelectInput` field reopens that field's panel and steals focus back to it — the user reported being unable to reach any other input in the form at all once they'd touched the searchable-select field.
  2. A stray anchored-popup bug: dismissing the software keyboard **without** selecting an option (swipe-to-dismiss on iOS, the keyboard's own hide affordance on Android, or any gesture that hides the keyboard without blurring the field) leaves the desktop-style `AnchoredOptionList` visible under the plain inline input once the panel closes.
- Business/user intent: Bug 1 makes any form containing a `SearchableSelectInput` alongside other fields effectively unusable past the first interaction — this is more severe than anything found in either predecessor plan and must be fixed first; everything else in this plan (including bug 2) is secondary to a form simply being usable. Bug 2 is a smaller but still real leftover-artifact issue: the panel takeover is meant to be the *entire* mobile experience, and the desktop anchored popup should never be reachable on a device that just had the keyboard panel.
- Non-goals:
  - No change to the panel's own animation or scroll lock — confirmed working (that's how both these bugs were even reachable to test).
  - No change to `forceSelection` semantics beyond reusing them correctly in bug 2's fix (dismissing the panel without a match, under `forceSelection`, must still revert-and-renotify, exactly as blur already does).
  - No Playwright spec — still no consuming feature/route to drive one against; both fixes were found and will be verified through the same RTL-level simulation used throughout this component's test suite, plus a manual real-device check for bug 1 specifically (a multi-field-form interaction is hard to fully trust from jsdom alone, per how it was actually found).
  - No redesign of `KeyboardInsetProvider`/`useKeyboardInset()` itself — the global signal is correct and useful; the bug is that `FloatingKeyboardBar` doesn't combine it with its own local focus ownership before acting on it.

## Scope

- In scope:
  1. **(Highest priority) Fix `FloatingKeyboardBar` mounting/stealing focus for a field the user isn't actually interacting with.** Currently (`packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`):
     - The one-shot snapshot at lines 86-90 — `if (isKeyboardOpen && !wasKeyboardOpenRef.current) { hadEditableFocusOnOpenRef.current = isEditableElement(document.activeElement); }` — only checks that *some* editable element is focused anywhere on the page, not that it's *this instance's own* input.
     - The panel-mount effect (lines 103-146) mounts the panel purely because the global `isKeyboardOpen` is `true` — it doesn't consult `hadEditableFocusOnOpenRef` (or any per-instance signal) at all.
     - Both of these need replacing with continuous, per-instance focus tracking — not a one-shot snapshot taken only at the moment the global flag transitions — because a normal form flow (tapping directly from one already-focused field to another, with the keyboard never actually closing in between) never re-triggers that transition, so a snapshot-based fix would still fail to notice the newly-focused field in that common case.
  2. **Fix `isOpen` never resetting when the keyboard/panel closes without a blur event.** `isOpen` (`packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`) is only ever reset via `closeList()`, called from `commitOption`, `commitText`, `revertToLastCommitted`, the `"Tab"` keydown case, and the "text already matches" branch inside `handleBlur`. Nothing resets it when the panel closes through a path that never blurs the underlying input — which is exactly what a keyboard-dismiss gesture (as opposed to tapping elsewhere) typically does on both iOS and Android. Once the panel unmounts and `isInlineHidden` goes back to `false`, the existing `!isInlineHidden && isOpen` condition (correctly added by the immediate predecessor plan to fix the duplicate-id bug) now lets the anchored popup render again under the plain, keyboard-closed input.
  3. **Wire a panel-dismiss signal from `FloatingKeyboardBar`'s floating copy back into `SearchableSelectInput`**, using the floating `SearchableSelectControls` instance's own mount/unmount lifecycle (it already mounts and unmounts exactly in step with `isPanelMounted`) rather than adding any new state to `FloatingKeyboardBar` itself.
  4. **Reuse `handleBlur`'s existing revert/commit logic** for this signal rather than duplicating it — the panel closing without a real blur should be treated exactly like a blur, since there is no meaningful "still interacting, keyboard just happens to be gone" state on mobile once the takeover ends.
  5. **Tests** covering both bugs: for bug 1, multiple `FloatingKeyboardBar variant="panel"` instances mounted simultaneously, one focused and then blurred in favor of a plain unrelated input elsewhere — assert only the instance whose own field is actually focused ever mounts a panel or receives focus. For bug 2: focus → keyboard/panel opens → dismiss the keyboard via a path that does not fire a blur event (simulated directly, since jsdom cannot reproduce a real OS keyboard-dismiss gesture) → assert no anchored popup renders afterward, and that the correct commit/revert/clear happened exactly as it would have on a real blur.
- Out of scope:
  - Any change to the inline copy's own lifecycle for bug 2 — it does not have an equivalent "closes without warning" problem; it persists for the component's whole lifetime and that fix only concerns the floating copy's mount/unmount cycle.
  - Bug 2's fix requires no change to `FloatingKeyboardBarProps`'s public shape — it is entirely internal to `SearchableSelectInput`/`SearchableSelectControls`.
  - Bug 1's fix **does** change `FloatingKeyboardBar`'s internals (see below) but not its public `renderControls` callback shape — no new field is needed there; the fix is entirely about which internal signal gates mounting/focus, not about what's communicated to consumers.
- Assumptions:
  - Bug 1's fix must apply to **both** variants (`"bar"` and `"panel"`), not just the panel path — `hadEditableFocusOnOpenRef`/`wasKeyboardOpenRef` are shared by both, and the same cross-instance interference is logically possible for `variant="bar"` too (multiple bar-variant fields on one page), even though it wasn't what the user happened to hit. Fixing it only for the panel path would leave the identical bug in the older variant.
  - The robust fix for bug 1 is continuous, per-instance "is my own input currently focused" tracking (via `focusin`/`focusout` listeners checked against this instance's own known input refs), combined with `isKeyboardOpen`, replacing the one-shot snapshot approach entirely — not patching the snapshot to be more precise, since the snapshot approach is fundamentally the wrong shape of signal (edge-triggered off the wrong event).
  - The floating `SearchableSelectControls` instance mounts and unmounts exactly when `isPanelMounted` flips — confirmed by the predecessor plan's own fix (the portal only renders `floatingControls` while `isPanelMounted` is `true`) and unchanged by this plan.
  - A plain `useEffect` (not `useLayoutEffect`) is the right place for bug 2's unmount signal: it runs after commit/paint, by which point the floating input's DOM node has already been detached and the browser has already moved focus away from it — so `isKnownInput(document.activeElement)` correctly evaluates to `false` when the reused `handleBlur` logic runs, exactly as it would for a real external blur.
  - The callback passed to the floating instance must be read through a ref updated on every render (not captured once at mount), because the `useEffect` cleanup that signals "the panel just closed" is set up once and would otherwise see a stale closure over an old `queryText` — a standard "latest ref" pattern, not a novel risk.

## Clarifications required

None open — this is an unambiguous bug fix confirmed against the actual shipped code.

## Acceptance criteria

1. With two or more `FloatingKeyboardBar variant="panel"` instances mounted at once (simulating two fields on one form, e.g. a `SearchableSelectInput` plus a plain text input also wrapped in the primitive, or two `SearchableSelectInput`s), focusing field A opens only field A's panel. Blurring field A and focusing field B opens only field B's panel — field A's panel does not reopen, and focus is not stolen back to field A.
2. The above holds regardless of whether the keyboard ever visually closes between the two focus changes — i.e., tapping directly from field A to field B while the keyboard stays continuously open must still correctly open field B's panel (and not field A's), not just the case where the keyboard closes and reopens.
3. `variant="bar"` gets the same fix and the same guarantee (criteria 1-2 apply to it too), verified by extending its existing test coverage, not just the panel variant's.
4. After focusing the field, opening the panel, typing or not typing anything, and dismissing the keyboard through a path that does not blur the input, no `AnchoredOptionList`/popup is visible once control returns to the inline copy.
5. The dismissal is treated exactly like a blur: if `forceSelection` is true and the text doesn't match a committed option, the field reverts to the last committed display value and `onValueChange` is re-invoked with that value (per the immediately preceding corrections plan's revert-and-renotify rule); if `forceSelection` is false, the current text commits (or clears to `null` if empty), exactly as an ordinary blur would.
6. If the panel closes because the user *did* select an option (the existing, already-correct path — `commitOption` already calls `closeList()` and blurs deliberately), this fix introduces no double-commit, no duplicate `onValueChange` call, and no visible regression — the new unmount-driven signal and the existing selection-driven close must not fight each other.
7. If the panel closes because `Escape` was pressed (already calls `closeList()` and blurs deliberately, per the original corrections plan), same non-interference guarantee as criterion 6.
8. Bug 2's fix requires no change to `FloatingKeyboardBarProps`'s public callback shape; bug 1's fix changes internal logic only, not the public `renderControls` callback shape either.
9. New tests exist and pass for: cross-instance isolation (criteria 1-3 — this is the most important coverage in this plan, since it's the one that would have caught the worst bug before it shipped), the exact reported dismiss-without-selection scenario (criteria 4-5), and non-interference with the selection and Escape paths (criteria 6-7).
10. All existing tests across both predecessor plans continue to pass unchanged.

## Contracts and skills

### Contracts loaded

- `architecture/37_keyboard_aware_inputs.md`: no content change, but the contract's ownership principle ("`FloatingKeyboardBar` owns the inline/floating duplication") is exactly why this fix deliberately does *not* add new state to `FloatingKeyboardBar` — the floating copy's existing mount/unmount lifecycle is already sufficient, and adding a redundant explicit "panel closed" boolean there would duplicate information the primitive already implicitly provides.
- `architecture/06_client_state.md`: confirms `isOpen`/the fix's bookkeeping stays in component-local `useState`/`useRef`, no new store.
- `architecture/02_types.md`: the new callback prop must be typed precisely (`() => void`), no `any`.
- `architecture/17_testing.md`: RTL query priorities and the "test what the user sees" principle guide the new tests — assert the absence of the popup role, not implementation details of the ref/effect mechanism.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Read `packages/ui/src/components/primitives/input/SearchableSelectInput.tsx` in full (current, post-corrections state) — relational, this is the file being fixed; confirmed `isOpen`'s only reset paths are the ones listed above.
- Re-confirmed `SearchableSelectControls`'s `!isInlineHidden && isOpen` condition (from the immediately preceding corrections plan) is the exact code path that surfaces the stale `isOpen` as a visible bug — relational, establishes why this is a distinct, newly-reachable bug rather than a repeat of the duplicate-id fix.

### Skill selection

- Primary skill: none — bugfix plan.
- Trigger terms: none beyond the existing `keyboard`/`FloatingKeyboardBar` routing already established for this component.
- Excluded alternatives: none relevant.

## Implementation plan

1. **Replace the one-shot "did the keyboard just open" snapshot with continuous, per-instance focus tracking** (`packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`) — do this first; every other fix in this plan only matters once a form with multiple fields is actually usable:
   - Remove `wasKeyboardOpenRef`, `hadEditableFocusOnOpenRef`, and the `isEditableElement` snapshot check at the top of the render body (lines 39-52, 63-64, 86-90) — this entire mechanism is the wrong shape of signal (edge-triggered off the wrong event, per Assumptions) and is being replaced, not patched.
   - Add local state `const [isOwnFieldFocused, setIsOwnFieldFocused] = useState(false);` and track it via document-level `focusin`/`focusout` listeners (these bubble, unlike plain `focus`/`blur`, so one pair of listeners covers both the inline and floating copies without needing to re-attach when refs change):
     ```ts
     useEffect(() => {
       function isOwnInput(target: EventTarget | null): boolean {
         return (
           target === inlineInputRef.current ||
           target === floatingInputRef.current ||
           target === noopInputRef.current
         );
       }

       function handleFocusIn(event: FocusEvent): void {
         if (isOwnInput(event.target)) {
           setIsOwnFieldFocused(true);
         }
       }

       function handleFocusOut(event: FocusEvent): void {
         if (!isOwnInput(event.target)) {
           return;
         }
         // Defer: focus may be transferring between our own inline/floating copies.
         queueMicrotask(() => {
           if (!isOwnInput(document.activeElement)) {
             setIsOwnFieldFocused(false);
           }
         });
       }

       document.addEventListener("focusin", handleFocusIn);
       document.addEventListener("focusout", handleFocusOut);
       return () => {
         document.removeEventListener("focusin", handleFocusIn);
         document.removeEventListener("focusout", handleFocusOut);
       };
     }, []);
     ```
   - Replace the focus-transfer effect's guard and the panel-mount effect's mount condition to require **both** `isKeyboardOpen` and `isOwnFieldFocused` — key both effects' dependency arrays on `[isKeyboardOpen, isOwnFieldFocused, ...]` (in addition to whatever they already depend on) so either flag changing re-evaluates whether this instance should be active, rather than only reacting when `isKeyboardOpen` itself transitions. This is what fixes the "tap directly from field A to field B while the keyboard stays continuously open" case (acceptance criterion 2) — `isOwnFieldFocused` changing is now itself a trigger, independent of whether the global keyboard flag also happens to change at the same moment.
   - Apply this to **both** variants — `variant="bar"`'s existing focus-transfer effect must also gate on `isOwnFieldFocused`, not just `isKeyboardOpen` (acceptance criterion 3).
   - The panel-mount effect's *closing* branch should trigger on `!isKeyboardOpen || !isOwnFieldFocused` (either one going false ends this instance's panel), matching the same "both must hold" logic in reverse.

2. **Add a ref-backed "latest panel-dismiss handler" plumbing in `SearchableSelectInput`** (`packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`):
   - No new public prop — this is entirely internal wiring between `SearchableSelectInput` and its own `SearchableSelectControls` children.
   - Reuse `handleBlur` directly as the dismiss handler: `function handlePanelDismiss(): void { handleBlur(queryText); }` — defined fresh each render (like every other handler here), so it always closes over the current `queryText`.

3. **Thread a `onPanelDismiss: () => void` field through `SearchableSelectControlsProps`**, passed into `renderControls`'s call to `<SearchableSelectControls>` alongside the existing props (value: `handlePanelDismiss` from step 2 — the same function passed on every render, letting the child's "keep latest" ref pick up the newest closure each time).

4. **Inside `SearchableSelectControls`, add the unmount-signal effect:**
   ```ts
   const onPanelDismissRef = useRef(onPanelDismiss);
   onPanelDismissRef.current = onPanelDismiss; // always latest, plain assignment during render

   useEffect(() => {
     if (!isFloating) {
       return;
     }
     return () => {
       onPanelDismissRef.current();
     };
   }, [isFloating]);
   ```
   - `isFloating` is invariant for a given instance (the inline slot's instance is always `false`, the floating slot's is always `true`), so this cleanup fires exactly once per panel open/close cycle — when the floating instance unmounts, i.e., exactly when `isPanelMounted` flips back to `false`.
   - Deliberately a plain `useEffect`, not `useLayoutEffect` — confirm in testing that this runs after the floating input's DOM node is actually detached and focus has moved away, so `handleBlur`'s internal `isKnownInput(document.activeElement)` check correctly reports `false` (see Assumptions).

5. **Verify non-interference with the two existing deliberate-close paths** (selection and Escape, both already call `closeList()` and `.blur()` explicitly, guarded by `skipNextBlurCommitRef`):
   - When the user selects an option, `commitOption` already sets `queryText` to the selected `displayValue` and calls `notify(...)` before blurring — so by the time the floating instance unmounts and this new effect's cleanup fires `handleBlur(queryText)`, `queryText` already matches `lastCommittedResultRef`'s display value, so `handleBlur`'s "already matches" branch runs (`closeList(); return;`) — a harmless no-op re-close, not a double-commit. Confirm this with a test (acceptance criterion 6) rather than assuming it.
   - Same reasoning applies to Escape (acceptance criterion 7) — `revertToLastCommitted`/`closeList()` already ran and `queryText` already matches before the unmount-driven `handleBlur` runs.
   - If testing reveals any interference (e.g., a genuinely duplicate `onValueChange` call — `notify` is not strictly idempotent in call count, only in resulting value, and some consumer might reasonably assume `onValueChange` fires at most once per user action), reuse `skipNextBlurCommitRef` for this path too rather than inventing a second guard flag.

6. **Tests:**
   - `FloatingKeyboardBar.test.tsx`: **first and most important** — render two `FloatingKeyboardBar variant="panel"` instances side by side (each with its own `renderControls` rendering a distinct `<input>`), mock `isKeyboardOpen` open on focusing instance A's input, assert only instance A's panel mounts; then blur A and focus instance B's plain input directly (keyboard staying open throughout, no false→true transition in between) — assert instance B's panel mounts and instance A's does not reopen and does not steal focus. Repeat for `variant="bar"` (acceptance criteria 1-3).
   - `SearchableSelectInput.test.tsx`: the dismiss-without-blur regression — render with `forceSelection` both `true` and `false`; focus the field; simulate the panel opening and closing *without* firing a blur event on the input (i.e., unmount the floating render path directly, or drive the same state transition RTL already uses elsewhere in this suite for the keyboard-open/close cycle, deliberately not calling `fireEvent.blur`); assert no element with `role="listbox"`/`role="option"` remains in the document afterward.
   - Under `forceSelection`, assert the revert-and-renotify behavior fires (matches the existing pattern already tested for real blur in this same file).
   - Under non-`forceSelection` with typed, non-matching text, assert it commits as `{ type: "text", text }`, matching real-blur behavior.
   - Non-interference tests for the selection-then-dismiss and Escape-then-dismiss sequences (criteria 6-7) — assert `onValueChange` call count and final value are unchanged from the predecessor plan's existing coverage for those paths.

## Risks and mitigations

- Risk: replacing the snapshot mechanism with `document`-level `focusin`/`focusout` listeners (step 1) adds one pair of global listeners per `FloatingKeyboardBar` instance — on a form with many keyboard-aware fields, this is many listeners on the same document, though each does trivial, cheap work (a few reference comparisons) per focus change, which is infrequent by nature (not a scroll/resize-frequency event).
  Mitigation: acceptable; this is the standard, correct way to observe focus changes anywhere in the document without needing every consumer to wire an `onFocus`/`onBlur` prop through `renderControls`, and focus changes are orders of magnitude less frequent than the scroll/animation-frame-driven code elsewhere in this same file.
- Risk: fixing this for both variants (`"bar"` and `"panel"`) touches shared code every existing `FloatingKeyboardBar` consumer depends on (`ItemUpholsteryAmountSheetPage.tsx`, `TaskAssortmentSheetPage.tsx`, any `NumericKeyboardBar`/`KeyboardAccessoryBar` usage that indirectly shares this file) — a bigger blast radius than either predecessor plan's changes.
  Mitigation: the fix does not change either variant's public behavior in the single-instance case (the case those existing consumers are actually in) — it only changes behavior when *multiple* instances are mounted simultaneously, which none of the existing consumers do today. Existing `variant="bar"` tests must pass unmodified; this is the regression gate.
- Risk: the "latest ref" pattern (steps 2-4) is a well-known but easy-to-get-subtly-wrong React idiom — if the ref update (`onPanelDismissRef.current = onPanelDismiss`) is accidentally placed inside an effect instead of directly in the render body, it would lag one render behind and reintroduce a milder version of the same staleness bug.
  Mitigation: called out explicitly in step 4 as a plain assignment during render, not inside an effect — a one-line, easily-reviewed detail.
- Risk: the unmount effect could fire during unrelated unmounts of the floating instance — e.g., if `SearchableSelectInput` itself unmounts entirely (the whole field is removed from the page) while the panel happens to be open.
  Mitigation: `handleBlur`'s internal logic operates purely on refs and calls `onValueChange`/local state setters — calling it once more during a full component teardown is inert (React discards the resulting state updates on an unmounting component; `onValueChange` firing once more with the already-current value is a harmless, idempotent no-op for any reasonable consumer). Not worth special-casing.
- Risk: this is the fourth corrections pass on the same primitive within one day (two prior plans plus this one's two bundled bugs) — strongly suggests the original plan under-specified real multi-field-form and real-device interaction paths that are hard to simulate in RTL/jsdom alone (both remaining bugs in this plan were found by hands-on testing, not by any test suite).
  Mitigation: none of substance for the current diff, but worth naming plainly — future keyboard-panel-affecting changes to this primitive should get a real mobile smoke test, in a form with more than one keyboard-aware field, before being considered done, not just RTL green. This class of bug (state that depends on *how* focus/keyboard state changes across multiple instances, not just one instance's final value) has now shown up repeatedly.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:ui` (or `npx vitest run --config packages/ui/vitest.config.ts`): all existing tests continue to pass, plus the new tests from step 6.
- Manual/real-device check (no Playwright yet, same reasoning as both predecessor plans): reproduce both original reports — (1) fill the `SearchableSelectInput` field, then confirm every other field in `InternalFormContent.tsx` remains normally tappable and focusable; (2) open the panel, dismiss the keyboard via swipe/hide-icon without selecting, confirm no stray popup appears.

## Review log

- `2026-07-13` `Claude`: Authored after the user reported, via hands-on testing immediately following the previous corrections plan, that dismissing the keyboard without a selection leaves a stray anchored popup visible. Root-caused to `isOpen` never being reset except through explicit interaction handlers, none of which fire when the keyboard closes via a gesture that doesn't blur the input (common on both iOS and Android). Fix: treat the floating copy's own unmount (which already coincides exactly with the panel closing) as equivalent to a blur, reusing the existing `handleBlur` logic rather than duplicating it.
- `2026-07-13` `User`: Reported, before this plan was sent to Codex, a more severe issue found in the same hands-on session — after using the `SearchableSelectInput` test field in `InternalFormContent.tsx`, no other field in the form could be focused; tapping any of them reopened the searchable-select field's panel instead. Root-caused to `FloatingKeyboardBar` reacting to the app-wide `isKeyboardOpen` signal with no check that its *own* field is the one actually focused — every mounted instance independently mounts its panel whenever *any* input anywhere causes the keyboard to open. Elevated to this plan's highest-priority fix, ahead of the dismiss-without-blur bug, since it breaks every other field in a form, not just this one field's own leftover state. Fix: replace the one-shot global-transition snapshot with continuous, per-instance `focusin`/`focusout` tracking, applied to both `FloatingKeyboardBar` variants.
- `2026-07-13` `Codex`: Implemented per-instance focus ownership for both keyboard-bar variants, added floating-copy unmount dismissal handling for searchable-select blur semantics, and added cross-instance/dismissal regression coverage. `npm run test:ui` passed 5 files / 22 tests; `npm run typecheck` passed with zero TypeScript errors. Real-device validation remains a consuming-feature follow-up.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
