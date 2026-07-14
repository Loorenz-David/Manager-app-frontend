# PLAN_searchable_select_input_20260713

## Metadata

- Plan ID: `PLAN_searchable_select_input_20260713`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-13T00:00:00Z`
- Last updated at (UTC): `2026-07-13T09:47:31Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/input_select.md`
- Related contract (infra dependency, updated by this plan): `architecture/37_keyboard_aware_inputs.md`
- Plan type: single-phase plan (not a master plan). Two tightly-coupled deliverables are bundled because the second cannot be built or tested without the first: (A) a minimal, additive extension to the existing `FloatingKeyboardBar` shared primitive, and (B) the new `SearchableSelectInput` primitive that consumes it.

## Goal and intent

- Goal: Build a generic, reusable searchable single-select input primitive (`SearchableSelectInput`) in `@beyo/ui` that narrows a supplied option list as the user types, and — on devices where the software keyboard opens — presents the input and the narrowed list as a full takeover panel above the keyboard instead of a small anchored popup, by extending the existing `FloatingKeyboardBar` primitive rather than introducing a new keyboard/positioning mechanism.
- Business/user intent: Give feature teams one shared combobox-style input for narrow-as-you-type selection (e.g., picking a customer, a code, a category) that behaves correctly on both desktop (anchored dropdown) and mobile (full-height keyboard-safe takeover), without every consuming feature reinventing keyboard-avoidance or filtering logic.
- Non-goals (carried from the intention doc, `input_select.md`, unless explicitly overridden below):
  - Domain-specific option parsing, labels, or error messages.
  - Remote search / async option loading / API calls.
  - Multi-select behavior.
  - Persisting selected values or converting them into request payloads.
  - Virtualized rendering for very large option sets.
  - Viewport-collision "flip above" logic for the desktop anchored popup — it always renders below the input, height-capped with internal scrolling (see Assumption A3).
  - Using `useSurfaceStore` / the app-level surface system for the mobile presentation — explicitly ruled out by the user; the mobile takeover is a portal, exactly like `FloatingKeyboardBar` already is.
  - A Playwright/runtime-validation spec in this plan — there is no consuming feature page yet (see Validation plan).

## Scope

- In scope:
  1. Extend `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx` with an additive `variant?: "bar" | "panel"` prop and an additive `isFloating: boolean` field on the `renderControls` callback argument.
  2. Animated choreography for `variant="panel"`: input slide, background fade, sequenced list fade-in, and a clip-path "wipe" boundary tied to the input's live position — all derived from one Framer Motion value, using the centralized tokens from `@beyo/lib`'s `animation.ts`, with a reduced-motion fallback.
  3. Background-scroll lock while the panel is open, so the option list's own internal scroll works without the page behind it also moving — a small custom hook, since Vaul's scroll lock (the only existing one in this codebase) is coupled to `Drawer.Root` and unavailable to a raw portal.
  4. New `packages/ui/src/components/primitives/option-list/` primitives: `OptionList` (pure list rendering, no positioning) and `AnchoredOptionList` (desktop-only positioning wrapper).
  5. New `packages/ui/src/components/primitives/input/SearchableSelectInput.tsx` composing `TextInput` + `OptionList`/`AnchoredOptionList` + the extended `FloatingKeyboardBar`.
  6. Shared types for the standardized option contract and the commit-result discriminated union.
  7. Public exports through `packages/ui/src/index.ts` (and local barrels).
  8. Vitest + RTL unit/interaction tests for all new/changed primitives.
  9. Canonical contract update: `architecture/37_keyboard_aware_inputs.md` gains a documented `variant="panel"` capability, including its animation and scroll-lock behavior (this is shared infra, not app-specific — canonical file is updated directly per the goal-mapping guide's rule: "If a change benefits all apps → update canonical here and re-stamp").
- Out of scope:
  - Wiring `SearchableSelectInput` into any real feature/page. No consumer exists yet; this plan delivers the primitive only.
  - Any change to `KeyboardInsetProvider`, `KeyboardAccessoryBar`, `NumericKeyboardBar`, or any app's `providers.tsx` — `KeyboardInsetProvider` is already mounted in all three apps.
  - Any change to `BoxPicker` (the only existing option-picker primitive) — confirmed to be a static grid/list picker with no search, no positioning, and no shared code worth extracting beyond visual state-naming conventions (active/selected/disabled), which this plan follows informally.
- Assumptions:
  - **A1 (soft — see Clarifications):** "The key used for making the match comparison" (user's wording) refers to the standardized `displayValue` field itself — i.e., there is no third, separate match-key field distinct from `value`/`displayValue`. Filtering matches user input against `displayValue` only, case-insensitive substring, per `input_select.md` §8.
  - **A2:** The parent is responsible for adapting domain objects into the standardized `{ value, displayValue }` shape before passing `options` — the primitive never receives raw domain entities (per `input_select.md`'s explicit non-goal on domain-specific option parsing, and the frontend contract guide's domain-grounding rule, which does not apply here since this primitive has no domain of its own).
  - **A3:** The desktop anchored popup always renders below the input (`AnchoredOptionList`), never flips above on viewport collision. Height is capped (`maxVisibleOptions`) with internal scroll, per `input_select.md` §9-10. No new positioning library is introduced — plain CSS `absolute` anchoring is sufficient, since no `Popover`/`floating-ui` infra exists anywhere in `packages/ui` today (confirmed by search — `BoxPicker` is the only existing picker primitive and has no positioning system).
  - **A4:** `OptionList`/`AnchoredOptionList` are **not** publicly exported from `packages/ui/src/index.ts` in this plan — only `SearchableSelectInput` and its types are, per `input_select.md` §20 ("Export the lower-level anchored option-list primitive publicly only when direct external reuse is intentional"). No current consumer needs direct reuse.
  - **A5:** Presentation mode (anchored popup vs. full keyboard panel) is **not** decided by `useBreakpoint()`/viewport width. It cannot be — `@beyo/hooks` peer-depends on `@beyo/ui` (confirmed: `packages/hooks/package.json` lists `@beyo/ui` as a peer; `BreakpointProvider.tsx` lives in `@beyo/hooks`), so a component inside `@beyo/ui` cannot import from `@beyo/hooks` without an import cycle. Instead, presentation mode is driven by `useKeyboardInset().isKeyboardOpen` (already local to `@beyo/ui`), which is a strictly better signal here: desktop mouse/trackpad interaction never triggers a software-keyboard `visualViewport` shrink, so `isKeyboardOpen` never becomes `true` there, and the component falls through to the anchored-popup path with zero device-detection code. This is the "encapsulate responsiveness internally" principle from `27_responsive.md`, adapted to the one signal that is actually load-bearing (keyboard presence, not screen width) and to the package's real dependency graph.
  - **A6:** The panel's scroll lock snapshots and restores whatever inline styles were already on `<body>` immediately before it applies its own (rather than assuming a known baseline). This means it composes safely if `SearchableSelectInput` happens to be rendered inside an already-open Vaul-based sheet/modal (which has already applied its own scroll lock) — our lock's cleanup restores exactly what it found, including Vaul's styles, rather than clobbering them. This is a defensive design property, not a claim that nested-scroll-container scrolling (e.g. a Vaul sheet's own internal scroll area, as opposed to `document`) is locked too — only `document`/`<body>`-level scroll is in scope for v1 (see Risks).

## Clarifications required

None open. Assumption A1 confirmed by the user (2026-07-13): `displayValue` is the sole match key — no separate match field. `SearchableSelectOption<TValue>` stays a 2-field contract (`value`, `displayValue`) plus optional `disabled`.

## Acceptance criteria

1. `SearchableSelectInput` exists in `@beyo/ui`, composes `TextInput` (unmodified), and accepts `options: readonly SearchableSelectOption<TValue>[]`.
2. Options are standardized as `{ value: TValue; displayValue: string; disabled?: boolean }` — the primitive never assumes `value === displayValue`.
3. On commit, `onValueChange` receives a `SearchableSelectResult<TValue>`: `{ type: "option"; option }` when a list item was selected, `{ type: "text"; text }` when the user typed a value with no match and `forceSelection` is not set, or `null` when cleared.
4. `forceSelection` prop (default `false`): when `true`, typed text that does not correspond to an option can never be committed — `onValueChange` only ever receives `{ type: "option" }` or `null`. On blur/Escape with unmatched text, the input reverts to the last legitimately committed result's display text, **and `onValueChange` is re-invoked with that same last-committed result** — the parent must be told the value is back to what it was, not left holding the stale `null` it received when the user started editing (see step 5's commit-rules table for the full state sequence).
5. On selection, the input's displayed text becomes `option.displayValue`. On freehand commit (non-`forceSelection`), the displayed text is exactly what the user typed.
6. Filtering is local, case-insensitive substring match against `displayValue`, memoized, and never mutates the supplied `options` array.
7. On a device where the software keyboard opens (`useKeyboardInset().isKeyboardOpen` becomes `true` while the input is focused), the input and the narrowed option list are presented as a full `bg-card` panel from the top of the viewport down to `bottom: var(--keyboard-inset)`, via `FloatingKeyboardBar variant="panel"` — not via `useSurfaceStore`, not via a new positioning system.
8. On a device where the keyboard never opens, the same component shows the option list as a popup anchored below the input (`AnchoredOptionList`).
9. Selecting an option while the panel presentation is active blurs the input, which closes the software keyboard and ends the takeover — the field returns to its normal inline position in the page displaying the selected `displayValue`, matching the exact user-facing flow: tap input → keyboard opens, input at top, options below → type to narrow → tap an option → input returns to its original position showing the selection. Selecting an option in the desktop anchored-popover presentation does **not** blur — it only closes the popup and keeps focus in the input, per standard combobox convention.
10. `FloatingKeyboardBar`'s existing consumers (`ItemUpholsteryAmountSheetPage.tsx`, `TaskAssortmentSheetPage.tsx`, any other `renderControls` caller) are unaffected — `variant` defaults to `"bar"` and the new `isFloating` field is additive to the callback argument object.
11. Opening the panel: the input visibly slides from its inline position to the top of the viewport, the `bg-card` background fades in over the same motion (not before or after it), and the option list fades in only once the input has essentially arrived — all three driven by one shared progress value, not independently-timed animations. Closing is the same choreography in reverse, using a faster transition config, with the input's slide and the background/list fade-out happening concurrently (not sequenced) — and as the input descends, the panel's visible content is clipped away above its current edge (a `clip-path` "wipe" bound to the same position value that drives the input's transform, not a separately-authored effect).
12. Users with `prefers-reduced-motion` get a plain opacity cross-fade instead of the slide/wipe choreography — no large spatial movement.
13. While the panel is open, the background page does not scroll (a custom scroll lock, not Vaul's, applied only for the `isFloating` duration) — touch/wheel input on the option list scrolls the list, not the page behind it. The lock releases and the page's scroll position is restored exactly when the panel closes.
14. Keyboard interaction (Arrow Up/Down/Home/End/Enter/Escape/Tab), active/selected/disabled option states, empty-state rendering, and ARIA combobox/listbox/option semantics match `input_select.md` §10-14 and §23 acceptance bullets, on both the anchored and panel presentations, since both share the same underlying `OptionList` and the same focused DOM input (transferred by `FloatingKeyboardBar`'s existing focus-handoff logic — not reimplemented).
15. `architecture/37_keyboard_aware_inputs.md` documents the new `variant="panel"` capability, its animation choreography, and its scroll lock: updated "Which primitive to use" table, updated `FloatingKeyboardBarProps` description, one new worked example.
16. Vitest + RTL tests cover rendering, filtering, pointer selection, keyboard navigation, `forceSelection` on/off behavior, accessibility attributes, the blur-ends-takeover behavior on selection (panel mode only), the scroll-lock apply/release lifecycle, and the `FloatingKeyboardBar` `variant="panel"` regression (existing `variant="bar"` behavior unchanged).

## Contracts and skills

### Contracts loaded

- `architecture/37_keyboard_aware_inputs.md`: authoritative contract for the mobile presentation — defines `FloatingKeyboardBar`, `useKeyboardInset`, `--keyboard-inset`, and explicitly forbids hand-rolling a duplicate "float above keyboard" pattern. This plan extends the designated primitive rather than replacing it.
- `architecture/02_types.md`: no-`any` rule, discriminated unions over optional-field ambiguity (`SearchableSelectResult` is a discriminated union per this rule, not `{ option?, text? }`), generic typing conventions.
- `architecture/06_client_state.md`: confirms internal search text / active option / open state belong in component-local `useState`, never Zustand ("selected rows in a table", "which tab is open" precedent applies directly — this is component-local UI state, not shared across routes).
- `architecture/07_components.md`: shared-UI-primitive rules — props-only (no context), named exports only, `forwardRef` for the input-wrapping surface, `cva` for variants, no nested component definitions, no default exports.
- `architecture/27_responsive.md`: "shared primitives encapsulate responsiveness internally, callers never branch on device" principle — applied per Assumption A5 (via `isKeyboardOpen`, not `useBreakpoint()`, for the reason given there).
- `architecture/35_shared_packages.md`: package-boundary conventions — no build step, named exports only from `index.ts`, no new `peerDependencies` needed (no new external library introduced), confirms the `@beyo/hooks` → `@beyo/ui` dependency direction that rules out `useBreakpoint()` here.
- `architecture/17_testing.md`: Vitest + RTL query priorities (`getByRole('combobox')`, `getByRole('listbox')`, `getByRole('option')` over `data-testid`), test-layer scope for shared UI components ("variant rendering, accessibility attributes").
- `architecture/31_animations.md`: designates Framer Motion (via `m` + `LazyMotion`) as the tool for exactly this class of transition ("Modal/drawer enter and exit"); supplies the centralized `durations`/`easings`/`transitions` tokens (`@beyo/lib/animation.ts`) this plan reuses rather than inventing new timing values; sets the performance rule (`opacity`/`transform` preferred, `top`/`left`/`width`/`height` avoided unless justified) that shapes the translateY-not-top/left decision and the explicit, documented exception for `clip-path`; requires `MotionConfig reducedMotion="user"` (already mounted at each app root) plus a component-level low-motion variant for large movement.

### Local extensions loaded

- None. No `*_local.md` companion exists for any of the above canonical files that is relevant to a shared-package UI primitive (the existing local companions — `01`, `04`, `12`, `28`, `30`, `34` — cover auth, API error shape, surfaces, dynamic loading, and runtime validation bootstrap, none of which this plan touches).

### Excluded contracts

- `architecture/01_architecture.md`, `04_api_client.md`, `05_server_state.md`, `13_errors.md`, `15_feature_structure.md`: this is a domain-agnostic shared UI primitive with no server state, no API calls, and no `features/<f>/` folder — these contracts govern the feature/data layer, which this plan never touches.
- `architecture/08_hooks.md`: the Action/Controller/Flow taxonomy is scoped to `features/<f>/{actions,controllers,flows}/` and backed by TanStack Query — not applicable. Only the "Utility hook" shape (domain-agnostic, no feature imports) is followed informally for the component's internal state hook, adapted to live beside the component inside the package (matching how `useKeyboardInset` itself already lives inside `packages/ui/src/providers/`, not in an app's `src/hooks/`).
- `architecture/28_surfaces.md`: explicitly not used — the user ruled out `useSurfaceStore`/the app-level surface system for this primitive's mobile presentation.
- `architecture/33_vaul_drawer.md`: Vaul itself is not used (this is a raw portal, not a `Drawer.Root`), so the primitive is not instantiated. Its "Scroll locking" section (confirming Vaul locks scroll automatically and warning that naive `overflow: hidden` on `<body>` alone loses scroll position on iOS Safari) was read relationally — not as a pattern to copy code from, but to understand _why_ a naive lock is wrong before writing this plan's own scroll-lock hook (step 1, "Scroll lock"), since no shared scroll-lock utility exists outside Vaul's internals to reuse directly for a non-drawer portal.
- `architecture/34_runtime_validation.md`: no Playwright spec in this plan — see Validation plan for reasoning.
- `architecture/14_styling.md`: no new `@source` registration needed — all new files live inside the already-sourced `packages/ui/src` directory; no new package is introduced.

### File read intent — pattern vs. relational

Applied the test from `task_system/frontend_contract_goal_mapping_guide.md` throughout research for this plan:

- Read `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx` in full — **relational**, required to know the exact current `renderControls` contract, portal structure, and focus-handoff logic being extended (not a pattern already covered by a contract; this file _is_ the pattern for Case C).
- Read `packages/ui/src/providers/KeyboardInsetProvider.tsx` — relational, to confirm `useKeyboardInset()`'s exact return shape (`{ isKeyboardOpen }`, boolean-only, no pixel value in context) before relying on it for presentation-mode branching.
- Read `packages/ui/src/components/primitives/input/TextInput.tsx` — relational, required to confirm the exact prop surface (`forwardRef<HTMLInputElement, TextInputProps>`, `invalid`, native `InputHTMLAttributes`) being composed, per the intention doc's explicit requirement to reuse it unmodified.
- Read `packages/ui/src/components/primitives/box-picker/BoxPicker.tsx` — relational, to confirm no existing anchored/searchable picker exists to reuse or conflict with (intention doc §21 explicitly requires checking for `BoxPicker` before designing a new option-list primitive).
- Read `architecture/31_animations.md` in full — relational/pattern: confirms Framer Motion is the designated tool for this class of transition and supplies the exact token names (`transitions.surface`, `transitions.base`) and performance rules to follow, before designing the panel's animation.
- Read `architecture/33_vaul_drawer.md`'s "Scroll locking" section — relational, to learn the specific iOS Safari failure mode (naive `overflow: hidden` loses scroll position) that this plan's custom scroll-lock hook must avoid, since Vaul's own lock isn't reusable outside a `Drawer.Root`.
- Did **not** read any other feature's action/controller/provider files to learn "how to write a hook" — not applicable here since no Action/Controller/Flow hook is being built.

### Skill selection

- Primary skill: none — this is architecture/planning work, not a code-generation skill invocation.
- Trigger terms: `keyboard`, `FloatingKeyboardBar`, `useKeyboardInset` → routed to `37_keyboard_aware_inputs.md` per the trigger expansion map.
- Excluded alternatives: `28_surfaces.md` trigger ("modal", "drawer", "surface") — explicitly excluded per user instruction to not use the surface system for this primitive.

## Implementation plan

1. **Extend `FloatingKeyboardBar`** (`packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`):
   - Add `variant?: "bar" | "panel"` to `FloatingKeyboardBarProps`, default `"bar"`.
   - Add `isFloating: boolean` to the object passed into `renderControls` (alongside existing `inputRef`, `preventFocusSteal`). Pass `isFloating: false` for the inline call (L68-71 today), `isFloating: true` for the floating call (L73-76 today).
   - When `variant === "panel"`, change the portal wrapper (currently L86-100, the bottom-pinned bar) to: outer `fixed inset-x-0 top-0 bottom-[var(--keyboard-inset)] z-[9999]` (no `pointer-events-none` needed since it now fills the space, not just a slim strip), inner `pointer-events-auto flex h-full flex-col bg-card` (drop the `border-t`/`shadow-xl`/bar-specific padding — panel fills edge-to-edge; add safe-area top padding: `pt-[var(--safe-top)]` if such a token exists in this codebase, otherwise `pt-safe` equivalent already used by other full-height surfaces — confirm exact token name against `ModalSurface.tsx`/`SlidePageSurface.tsx` before writing, do not invent a new one).
   - When `variant === "bar"` (default), behavior is byte-for-byte unchanged from today.
   - Do not touch the focus-handoff `useLayoutEffect` (L57-66) or the `wasKeyboardOpenRef`/`hadEditableFocusOnOpenRef` logic — it already works correctly regardless of container shape.

   **1a. Animated choreography (`variant="panel"` only)** — single-source-of-truth design so open/close can never desync, per `31_animations.md`:
   - One `useMotionValue<number>` named `progress` (0 = closed/inline, 1 = open/docked). Whenever `isKeyboardOpen` toggles, call the imperative `animate(progress, target, config)` (from `framer-motion`) — do **not** model this as React state driving `initial`/`animate`/`exit` variants, because the derived channels below need a live numeric value to read from via `useTransform`, and because an in-flight `animate()` call on a motion value retargets smoothly if called again before it finishes (e.g., the user reopens while it's mid-close) — this is what makes the choreography interruption-safe without any hand-written state machine.
     - Opening config: `transitions.surface` (from `@beyo/lib`'s `animation.ts` — `duration: durations.slow`, `ease: easings.emphasized`). Closing config: `transitions.base` (shorter duration, standard ease) — this is the entire "reverse but faster" requirement, expressed as two existing tokens driving the same value, not two animation systems.
   - **Measurement:** at the instant `isKeyboardOpen` flips `true` (before the inline copy becomes `invisible`), capture the inline wrapper's `getBoundingClientRect()` once (a one-shot imperative measurement, the same pattern `StagedForm` already uses for its footer height via `ResizeObserver`). Store the vertical distance between that rect's top and the panel's docked target top (viewport top + safe-area inset) as `travelDistance`.
   - **Input position — `transform`, not `top`/`left`:** the floating container's CSS `top` stays statically pinned at the docked target position; only `transform: translateY(...)` animates, via `useTransform(progress, [0, 1], [travelDistance, 0])`. This is a deliberate compliance point with `31_animations.md`'s performance table (prefer `transform`, avoid `top`/`left`) — the position is expressed as an offset from a fixed anchor, never as a recalculated `top`/`left`.
     - Reference implementation only if genuinely needed for the FLIP measurement math (this plan does **not** require `layout`/`layoutId` shared-element transitions — the manual `travelDistance` + `translateY` approach is deliberately chosen over framer's automatic `layout` FLIP, because the clip-path and list-fade channels below need to read the _same_ live numeric position, which is far more direct with an explicit `useTransform` chain than by hooking into framer's internal layout-animation progress).
   - **Background fade:** `useTransform(progress, [0, 1], [0, 1])` bound to the panel's `bg-card` wrapper's `opacity` — fades in across the same motion as the slide, not before or after.
   - **List fade-in, sequenced without a second timer:** `useTransform(progress, [0.7, 1], [0, 1])` bound to the `OptionList` wrapper's `opacity` — only starts appearing in the final 30% of the same `progress` range, so it visibly waits until the input has essentially arrived, without a chained/delayed second animation that could drift out of sync under interruption.
   - **The clip-path "wipe" boundary:** bind `clipPath` on the panel's content wrapper (the element containing `bg-card` + the list) to `useTransform(progress, (p) => \`inset(${(1 - p) * travelDistance}px 0px 0px 0px)\`)`— i.e., the same`travelDistance`value driving the input's`translateY`, re-expressed as a clip inset. On close, as `progress`falls, the inset grows and the panel's content is progressively clipped away from the top down, exactly tracking the input's current descending edge — this falls out of the shared formula, it is not a separate close-specific effect to author or keep in sync by hand.`clip-path` is a deliberate, documented exception to the "prefer opacity/transform" table (same class of justified exception the contract already grants accordion height animation) — opacity alone cannot produce an actual reveal/hide boundary, only translucency, and a hide *boundary\* (not translucency) is what "the input is the cleaner of this container" requires.
   - **Reduced motion:** `useReducedMotion()` — when true, skip the slide and the clip-path wipe entirely; animate only `opacity` (`progress` still drives 0↔1, but the `translateY`/`clipPath` transforms are skipped/fixed at their resting values) so the panel simply cross-fades in place, per `31_animations.md`'s explicit allowance ("fades are usually acceptable" for reduced motion).
   - Variants/transform config live beside `FloatingKeyboardBar.tsx` itself, not in a shared file, per `31_animations.md`'s "variants live near the UI they animate" rule.

   **1b. Scroll lock (`variant="panel"` only)** — new `packages/ui/src/components/primitives/floating-keyboard-bar/use-body-scroll-lock.ts`:
   - A small hook, `useBodyScrollLock(locked: boolean)`, applied by `FloatingKeyboardBar` only while `variant === "panel"` and `isFloating` is `true`.
   - Implementation must use the iOS-Safari-safe technique, not naive `overflow: hidden` (per `33_vaul_drawer.md`'s explicit warning that the naive approach loses scroll position on iOS Safari): on lock, capture `window.scrollY`, then set `document.body.style.position = "fixed"`, `top = "-${scrollY}px"`, `width = "100%"`, `overflow = "hidden"`; on unlock, restore the body's previous inline style values (snapshotted immediately before locking, not assumed) and call `window.scrollTo(0, scrollY)`.
   - Snapshot-and-restore (rather than assuming a known baseline) so this composes safely if `SearchableSelectInput` is ever used inside an already-open Vaul-locked sheet (Assumption A6) — this hook's cleanup restores whatever it found, including another lock already in place, instead of clobbering it.
   - This is genuinely new shared infrastructure, not a duplicate of anything — Vaul's scroll lock (the only one in this codebase, per `33_vaul_drawer.md`) is internal to `Drawer.Root` and not usable by a raw portal.

2. **Shared types** (`packages/ui/src/components/primitives/option-list/option-list.types.ts`):

   ```ts
   export type SearchableSelectOption<TValue extends string = string> = {
     value: TValue;
     displayValue: string;
     disabled?: boolean;
   };

   export type SearchableSelectResult<TValue extends string = string> =
     | { type: "option"; option: SearchableSelectOption<TValue> }
     | { type: "text"; text: string };
   ```

   `SearchableSelectInputProps.value`/`onValueChange` use `SearchableSelectResult<TValue> | null` (the `null` case models "nothing committed," kept outside the union per `02_types.md`'s guidance that the union should model the distinct non-null states, with `null` as the conventional "empty" sentinel already used elsewhere in this codebase's controlled-input props, e.g. `value: TValue | null` patterns in the intention doc itself).

3. **`OptionList`** (`packages/ui/src/components/primitives/option-list/OptionList.tsx`): pure, fully controlled list rendering. Props: `options: readonly SearchableSelectOption<TValue>[]`, `activeValue: TValue | null`, `selectedValue: TValue | null`, `onSelect: (option) => void`, `onActiveChange: (value: TValue | null) => void` (pointer hover reports up — parent remains sole owner of "active" per intention doc §12), `emptyMessage?`, `maxVisibleOptions?`, `listboxId`, `getOptionId: (value) => string` (for stable per-option DOM ids feeding `aria-activedescendant`). Renders `role="listbox"`, each item `role="option"` + `aria-selected` + `aria-disabled`. No positioning styles — caller controls width/height via `className`.

4. **`AnchoredOptionList`** (`packages/ui/src/components/primitives/option-list/AnchoredOptionList.tsx`): thin wrapper — `absolute top-full inset-x-0 mt-1 z-50 max-h-[...] overflow-y-auto rounded-lg border bg-card shadow-lg` around `OptionList`. Requires the parent (`SearchableSelectInput`'s root) to be `position: relative`. No new positioning dependency (Assumption A3).

5. **`SearchableSelectInput`** (`packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`):
   - Internal `useState` for `queryText: string`, `activeValue: TValue | null`, `isOpen: boolean` — never Zustand (per `06_client_state.md`).
   - `useMemo` filtered options: case-insensitive substring match of `queryText` against `displayValue`, never mutating `options`.
   - Root wrapper is `position: relative` (anchors `AnchoredOptionList`).
   - Renders:
     ```tsx
     <FloatingKeyboardBar
       variant="panel"
       renderControls={({ inputRef, preventFocusSteal, isFloating }) => (
         <div
           className={cn(
             "flex flex-col",
             isFloating && "h-full min-h-0 gap-2 p-4",
           )}
         >
           <TextInput
             ref={inputRef}
             value={queryText}
             onChange={handleQueryChange}
             onKeyDown={handleKeyDown}
             placeholder={placeholder}
             disabled={disabled}
             invalid={invalid}
           />
           {isFloating ? (
             <OptionList
               className="min-h-0 flex-1 overflow-y-auto"
               {...sharedListProps}
               onSelect={(option) => {
                 commitOption(option); // shared commit logic — see Commit rules
                 inputRef.current?.blur(); // ends the takeover: keyboard closes, isKeyboardOpen
                 // flips false, FloatingKeyboardBar unmounts the floating
                 // copy, and the inline copy (already in normal flow,
                 // just invisible) becomes visible again — this IS
                 // "the input goes back to its position."
               }}
             />
           ) : (
             isOpen && (
               <AnchoredOptionList
                 {...sharedListProps}
                 onSelect={commitOption} // desktop: closes the popup, keeps focus in the input —
                 // standard combobox behavior, no blur. There is no keyboard
                 // takeover to end here; blurring would be an unusual
                 // desktop UX regression, not a fix.
               />
             )
           )}
         </div>
       )}
     />
     ```
   - `isOpen` (the desktop anchored-popup visibility) is independent of `isFloating` — it is driven by focus/typing/Arrow keys exactly per `input_select.md` §10, and is simply never consulted on the `isFloating` branch (the panel always shows the list while the keyboard is open and the field is focused — no separate open/close state needed there, matching how `FloatingKeyboardBar` itself has no open/close state beyond `isKeyboardOpen`).
   - **Why the blur is required, and why it's the correct place to put it:** the panel is rendered purely as a function of `isKeyboardOpen` (via `isFloating`) — there is no independent "panel open" boolean to flip off. The only way to end the takeover is to make `isKeyboardOpen` go false, and the only way to do that from inside the component is to move focus off the live input so the OS dismisses the software keyboard, which `KeyboardInsetProvider`'s `visualViewport` listener then observes. This mirrors the exact mechanism `KeyboardAccessoryBar` already uses for its "Done" button (`activeField.blur()` when there's no next field) — not a new pattern, just the same one-line technique applied to selection instead of a toolbar button.
   - This blur runs through the same guarded blur handler from the paragraph below (the one that distinguishes a real dismiss from `FloatingKeyboardBar`'s internal inline↔floating handoff). Because `commitOption` already set `queryText` to the selected option's `displayValue` _before_ the blur fires, the guard's own re-commit check (`queryText` vs. `lastCommittedResultRef`) sees no divergence and no-ops — the blur only ends the takeover, it does not trigger a second, redundant `onValueChange` call.
   - Keyboard handler (`handleKeyDown`) implements Arrow Up/Down/Home/End/Enter/Escape/Tab exactly per `input_select.md` §11, operating on `activeValue`/filtered options — identical code path regardless of which copy (inline or floating) is focused, since `FloatingKeyboardBar` guarantees only one is ever the live DOM node.
   - **Commit rules** (resolves the user's `forceSelection` requirement precisely, confirmed 2026-07-13 — reverts must re-notify the parent, not go silent): the component keeps one extra internal ref, `lastCommittedResultRef: SearchableSelectResult<TValue> | null`, holding the last value actually handed to `onValueChange` that was **not** the "editing invalidated it" `null` below — i.e. the last real option selection or the last real freehand-text commit. This is what reverts restore, and what gets re-emitted.
     - **Editing after a commit** (`queryText` changes and no longer equals the currently-committed result's display text, per `input_select.md` §7): immediately call `onValueChange(null)` (the committed value is invalidated the moment the text diverges). This fires in both `forceSelection` states. `lastCommittedResultRef` is **not** cleared by this — it still remembers what was last real, purely for a potential revert.
     - Selecting an option (pointer or Enter-on-active): always → `onValueChange({ type: "option", option })`, update `lastCommittedResultRef` to this result, input text becomes `option.displayValue`, popup/panel list closes/collapses, `activeValue` resets.
     - Enter with no active option, `forceSelection` falsy, non-empty `queryText`: → `onValueChange({ type: "text", text: queryText })` (unmodified, not trimmed — "if typed it is the typed value" literally), update `lastCommittedResultRef` to this result.
     - Enter with no active option, `forceSelection` truthy: no-op — popup stays open, nothing commits (mirrors `input_select.md` §11's Enter rule when there is no active option, tightened by `forceSelection`).
     - Blur (focus leaving the whole composed control — see the guard below):
       - `forceSelection` falsy: current `queryText` becomes the committed value exactly like Enter would (empty string → commit `null`, update `lastCommittedResultRef` accordingly).
       - `forceSelection` truthy, and `queryText` does not match `lastCommittedResultRef`'s display text: revert `queryText` to that display text (or `""` if `lastCommittedResultRef` is `null`) **and re-call `onValueChange(lastCommittedResultRef)`** — this is the required re-notification. The parent's `value` had gone stale (`null`, from the editing-invalidation step above) the moment the user started typing; the revert must bring the parent back in sync with what the field now displays, not leave it holding the interim `null`.
     - Escape: same revert-and-renotify behavior as the `forceSelection` blur case above, applied regardless of `forceSelection` — restore `queryText` to `lastCommittedResultRef`'s display text (or `""`), close popup/panel, and re-call `onValueChange(lastCommittedResultRef)` if the parent's current `value` differs from it (i.e., if an edit had invalidated it to `null` first). If nothing was ever edited (`queryText` already matches), this is a no-op close with no redundant callback.
   - **Blur-handling guard (addresses a real risk — see Risks):** `FloatingKeyboardBar` transfers focus internally between the inline copy (`noopInputRef` while keyboard is open) and the floating copy (`floatingInputRef`) via its own `useLayoutEffect`. A naive `onBlur` on the `TextInput` would fire during that internal handoff and incorrectly trigger the revert/auto-commit logic above mid-transition. Guard by checking, inside the blur handler (on the next microtask/`requestAnimationFrame`, matching `FloatingKeyboardBar`'s own use of `requestAnimationFrame` for its scroll-into-view logic), whether `document.activeElement` is still one of the two `TextInput` DOM nodes rendered by this same `SearchableSelectInput` instance (inline or floating) — if so, this was an internal handoff, not a real dismiss, and no commit/revert should run.
   - Props surface: `options`, `value: SearchableSelectResult<TValue> | null`, `onValueChange`, `forceSelection?: boolean` (default `false`), `placeholder?`, `emptyMessage?`, `disabled?`, `invalid?`, `maxVisibleOptions?`, `id?`, `name?`, `'aria-describedby'?`.

6. **ARIA wiring**: `role="combobox"` on the wrapper or the `TextInput` (confirm which per existing focus-ring/aria patterns in `TextInput.tsx` — it does not currently set `role`, so this plan adds it via the `TextInput`'s native prop spread, not by modifying `TextInput.tsx` itself), `aria-expanded`, `aria-controls` → listbox id, `aria-activedescendant` → active option's DOM id, `aria-autocomplete="list"`. Same attributes apply whether the listbox is the `AnchoredOptionList` or the panel's `OptionList` — only one is ever mounted+visible at a time per the `isFloating` branch.

7. **Barrel exports**:
   - `packages/ui/src/components/primitives/option-list/index.ts`: internal only (not re-exported from the package root — Assumption A4).
   - `packages/ui/src/components/primitives/input/index.ts`: add `SearchableSelectInput`.
   - `packages/ui/src/index.ts`: export `SearchableSelectInput`, `type SearchableSelectInputProps`, `type SearchableSelectOption`, `type SearchableSelectResult`.

8. **Update `architecture/37_keyboard_aware_inputs.md`** (canonical, per the "benefits all apps → update canonical" rule):
   - Add `variant` and `isFloating` to the `FloatingKeyboardBarProps` description under "Case C."
   - Add a new worked example (or a "Case C — variant: panel" subsection) showing a full-height takeover use, referencing `SearchableSelectInput` as the canonical reference implementation (parallel to how `ItemUpholsteryAmountSheetPage.tsx` is cited as the canonical reference for `variant="bar"`).
   - Document the animation choreography (single `progress` motion value, the token pairing for open vs. close, the `clip-path` exception and why) and the scroll lock (why Vaul's isn't reusable here, the iOS-safe technique used instead) as part of the same subsection — this is exactly the kind of implementation-affecting detail this contract already documents for the existing `variant="bar"` focus-handoff logic.
   - Update the "Which primitive to use" table with a new row: "A full-height input+content takeover while the keyboard is open" → `FloatingKeyboardBar variant="panel"`.
   - Update "Responsibility split" table: add a row for the new scroll lock (`FloatingKeyboardBar` — panel variant only) alongside the existing keyboard-lift/pad rows, since it's a new piece of shared responsibility this variant introduces.

9. **Tests** (Vitest + RTL, per `17_testing.md`):
   - `FloatingKeyboardBar.test.tsx` (extend existing suite if present, else create): `variant="bar"` behavior unchanged (regression); `variant="panel"` renders the full-height container and calls `renderControls` with `isFloating: true/false` correctly at each phase.
   - `use-body-scroll-lock.test.ts`: locking sets `document.body.style` (`position`, `top`, `width`, `overflow`) and captures `window.scrollY`; unlocking restores the exact pre-lock style values (not a hardcoded default) and calls `window.scrollTo` with the captured value; locking twice/nesting restores correctly (Assumption A6). Note: this verifies the DOM mutations, not the actual browser scroll-blocking behavior or the visual animation — those require a real browser and are out of scope for Vitest/jsdom (see Validation plan).
   - `OptionList.test.tsx`: empty state, disabled option skip/no-select, `aria-selected`/`aria-disabled` correctness, does not mutate input array.
   - `SearchableSelectInput.test.tsx`: covering the acceptance-criteria list above — filtering, pointer selection, keyboard nav (Arrow/Home/End/Enter/Escape/Tab), `forceSelection` true/false commit paths, the mid-edit `onValueChange(null)` invalidation, and — the case most worth a dedicated assertion — that reverting on blur/Escape with `forceSelection` true re-invokes `onValueChange` with the prior `lastCommittedResultRef`, not silence; external `value` sync; accessibility attributes (`getByRole('combobox')`, `getByRole('listbox')`, `getByRole('option')` per `17_testing.md` query priority).

## Risks and mitigations

- Risk: Extending a widely-used shared primitive (`FloatingKeyboardBar`) regresses existing consumers.
  Mitigation: `variant` defaults to `"bar"` (present behavior byte-for-byte unchanged); `isFloating` is an additive field on an existing callback-argument object, so any `renderControls` implementation destructuring only `{ inputRef, preventFocusSteal }` is unaffected by TypeScript's structural typing. Run/extend the existing `FloatingKeyboardBar` test suite as a regression gate before merging (step 9).
- Risk: The internal focus handoff inside `FloatingKeyboardBar` (inline ↔ floating copy) fires a blur event on the `TextInput` that `SearchableSelectInput`'s own blur-driven commit/revert logic could misinterpret as the user leaving the control.
  Mitigation: explicit guard described in step 5 (defer blur handling one frame, check whether the newly-focused element is the sibling copy of the same instance before treating it as a real dismiss).
  Verdict: this needed to be spelled out precisely in this plan rather than left to Codex's judgment, since silently getting it wrong would look correct in isolation (simple focus/blur test) but break specifically during the mobile keyboard-open transition — the one scenario this whole plan exists to support.
- Risk: A brief visual flash of the anchored popup before the software keyboard finishes animating open (since `isKeyboardOpen` only flips once `visualViewport` shrinks past the existing 100px threshold in `KeyboardInsetProvider.tsx`).
  Mitigation: accepted as consistent with the transition behavior `FloatingKeyboardBar` already ships today for every existing consumer — not a new risk introduced by this plan, not fixed here.
- Risk: `AnchoredOptionList`'s below-only, non-flipping positioning could clip against the viewport bottom on desktop when the input sits low on the page.
  Mitigation: height-capped with internal scroll (`maxVisibleOptions`), explicitly scoped out of v1 per Assumption A3; acceptable because the primary hard case (mobile) is fully handled by the panel presentation, and this is standard behavior for many existing non-flipping dropdowns.
- Risk: naive `overflow: hidden` on `<body>` for the scroll lock loses scroll position on iOS Safari (the exact pitfall `33_vaul_drawer.md` warns about for Vaul's own lock).
  Mitigation: the scroll lock uses the `position: fixed; top: -${scrollY}px` capture/restore technique (step 1b), the same class of technique Vaul itself relies on — not plain `overflow: hidden`.
- Risk: the scroll lock and the animation's clip-path/transform channel both mutate different things (`<body>` inline style vs. a `motion.div`'s style), but if the lock applies/releases out of step with `isFloating`'s own true/false timing (e.g., released one tick early during the closing animation), the background page could become scrollable for a frame while the panel is still visibly closing.
  Mitigation: drive the lock directly off `isFloating` (the same boolean gating the animation), not off `progress` or any animation-completion callback — the lock's own timing is intentionally simpler and doesn't need to track the animation's easing curve, only whether the takeover is conceptually active.
- Risk: nested usage inside an already Vaul-locked sheet/modal (Assumption A6) is asserted to compose safely via snapshot-and-restore, but this has not been exercised against a real nested Vaul drawer in this plan (no consuming feature exists yet to test it against).
  Mitigation: the snapshot-and-restore design is defensive by construction (each lock restores exactly what it found), but flag this explicitly to the first consuming feature plan that nests `SearchableSelectInput` inside a sheet/modal — it should include a manual/Playwright check of this specific interaction, since it cannot be verified here without a real consumer.

## Validation plan

- `npm run typecheck`: zero TypeScript errors, including the extended `FloatingKeyboardBarProps` and the new generic `SearchableSelectInput<TValue>` types (no `any`, per `02_types.md`).
- `npm run test -- --grep FloatingKeyboardBar`: existing `variant="bar"` behavior passes unchanged; new `variant="panel"` cases pass.
- `npm run test -- --grep useBodyScrollLock`: lock/unlock DOM mutation and restore-exact-prior-styles coverage passes (jsdom-level only — see note in step 9; the actual scroll-blocking behavior and the animation's visual correctness require a real browser and are covered by the deferred Playwright pass below, once a consumer exists).
- `npm run test -- --grep SearchableSelectInput`: full acceptance-criteria coverage from step 9 passes, including both `forceSelection` states and the blur-guard path.
- `npm run test -- --grep OptionList`: empty/disabled/selected/active state and non-mutation coverage passes.
- Playwright (`npx playwright test --grep ...`): **deferred, not run in this plan.** `17_testing.md` requires both validation layers for a complete _feature_, but this plan delivers a shared primitive with no consuming route or surface yet — there is nothing to drive end-to-end in a real browser. The first feature plan that wires `SearchableSelectInput` into an actual field must include the mobile-project and desktop-project Playwright runs (per `34_runtime_validation.md`), exercising exactly the anchored-vs-panel switch this plan implements.

## Review log

- `2026-07-13` Claude: initial draft, incorporating the user's `forceSelection` requirement and the `FloatingKeyboardBar`-based mobile presentation agreed upon in prior discussion (not `useSurfaceStore`).
- `2026-07-13` User: confirmed Assumption A1 (`displayValue` is the sole match key). Corrected the `forceSelection` revert behavior — the parent must be re-notified via `onValueChange` when a rejected freehand edit reverts to the prior selection, not left silent; the reverted value itself (the prior selection) was already correct. Plan updated: added `lastCommittedResultRef`, the mid-edit `onValueChange(null)` invalidation step, and the revert-and-renotify rule for both `forceSelection` blur and `Escape`.
- `2026-07-13` User: walked through the end-to-end user flow (tap input → keyboard opens, input at top, options below → type to narrow → tap option → input returns to its original position showing the selection). This surfaced a gap: the draft never specified that selecting an option in panel mode must blur the input to actually end the takeover — without it, the keyboard and panel would stay open after selection instead of the field "going back to its position." Fixed by having the panel's `OptionList.onSelect` call `inputRef.current?.blur()` after committing, scoped to the panel/floating presentation only (the desktop anchored popover keeps focus on selection, per normal combobox convention — there is no takeover to end there). Added as acceptance criterion 9.
- `2026-07-13` User: requested an animated choreography for the panel (input slides up as keyboard opens, bg fades in during the slide, list fades in only once the input has arrived; reverse-but-faster on close; the input acts as a clip/wipe boundary — nothing visible above its current edge as it slides), plus a background-scroll lock so the option list's own scroll works normally. Discussed the approach before writing it in, per the user's request: agreed on a single Framer Motion `progress` value driving every visual channel via `useTransform` (input `translateY`, background opacity, range-remapped list opacity for the "fades in last" sequencing, and a `clip-path` inset for the wipe boundary) — chosen specifically for interruption-safety (retargeting mid-flight) over hand-timed independent animations, and reusing `31_animations.md`'s existing `transitions.surface`/`transitions.base` tokens for the open/close speed asymmetry. Scroll lock: a new custom hook (not Vaul's, which is coupled to `Drawer.Root`), using the iOS-Safari-safe `position: fixed` + scroll-restore technique `33_vaul_drawer.md` implies Vaul itself relies on. Both added to step 1 (as 1a/1b), with new acceptance criteria 11-13 and corresponding risks/tests.
- `2026-07-13` Codex: implemented the shared panel variant, searchable select, option-list primitives, exports, tests, and canonical keyboard-aware-input contract update. `npm run typecheck` passed; the package RTL suite passed 5 files / 12 tests. Browser validation remains deferred until a consuming feature exists, as specified by the plan.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Claude`
