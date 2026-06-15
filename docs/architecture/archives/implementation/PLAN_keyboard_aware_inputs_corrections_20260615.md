# PLAN_keyboard_aware_inputs_corrections_20260615

## Metadata

- Plan ID: `PLAN_keyboard_aware_inputs_corrections_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T11:24:20Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_aware_inputs_20260615.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_keyboard_aware_inputs_20260615.md`

## Goal and intent

- Goal: Close the gaps and issues found in the post-implementation review of
  `PLAN_keyboard_aware_inputs_20260615` so the keyboard-aware input system actually meets
  its original promise — keyboard-aware inputs in **every** surface and the main app shell,
  a primitive that fully encapsulates the floating-bar pattern (no per-consumer dual-input
  juggling), a robust focus transfer, and a validation gate that covers the apps it touches.
- Business/user intent: The first implementation fixed the Vaul corruption bug but only wired
  the keyboard inset into bottom sheets. Inputs in slide pages, modals, and the main app are
  still occluded by the keyboard, and the next feature that wants a floating bar would have to
  re-hand-roll the fragile inline/floating duplication. This plan makes the system uniformly
  reliable, as originally intended.
- Non-goals:
  - No change to the keyboard-height math, the `--keyboard-inset` mechanism, or
    `repositionInputs={false}` — those are correct and stay.
  - No query/action/domain contract changes — UI/layout layer only.
  - No change to upholstery business logic (multiplier math, save flow, warning).

## Scope

- Depends on: `PLAN_keyboard_sheet_lift_hotfix_20260615` must land and be verified on-device
  **first**. That hotfix establishes the bottom-sheet **lift** (offset `Drawer.Content` by
  `--keyboard-inset`) and removes the provider re-render storm. This plan builds on that split:
  bottom sheets lift; full-height surfaces use scroll padding.
- In scope:
  1. **Full surface coverage of `--keyboard-inset`** — `SlidePageSurface`, `ModalSurface`, and
     the main app shell scroll container consume the inset, the same way `BottomSheetSurface`
     already does.
  2. **Centralize the remaining surfaces** — `ModalSurface` and `SlidePageSurface` are still
     duplicated across `@beyo/ui` and each app (only `BottomSheetSurface` was centralized).
     Converge them onto the shared `@beyo/ui` copies so the inset fix lives in one place,
     consistent with the predecessor plan's centralization decision.
  3. **Encapsulate the floating-bar pattern in the primitive** — move the inline-mirror input,
     the `invisible` visibility toggle, and the focus-transfer into `FloatingKeyboardBar` via a
     render-prop API, so consumers declare their controls once.
  4. **Harden focus transfer** — focus the floating input with `useLayoutEffect` (synchronous,
     pre-paint) so moving focus from the inline input does not drop the soft keyboard.
  5. **Refactor `ItemUpholsteryAmountSheetPage`** to the new primitive API (single declaration
     of the controls).
  6. **Widen the validation gate** — add a `typecheck` script to the sellers app and make the
     root `typecheck` run all three apps plus the changed packages.
  7. **Minor polish** — remove the unnecessary `canPortal` SSR guard in `FloatingKeyboardBar`;
     align the sellers `KeyboardInsetProvider` mount with the managers/workers convention.
- Out of scope:
  - Converting every existing main-app form to a floating bar (the inset baseline is enough;
    floating bars stay opt-in).
  - Snap points or any other Vaul behavior change.
- Assumptions:
  - The system stays in shared packages and apps import it (decision from the predecessor plan).
  - `ModalSurface`/`SlidePageSurface` local copies are functionally equivalent to the shared
    `@beyo/ui` copies (to be verified by diff in Step 1; if a real divergence exists,
    parameterize the shared surface rather than keeping a fork).
  - The main app's primary scroll container is `TabOutlet`'s `h-full overflow-y-auto` wrapper
    (confirmed in managers and workers); nested page-level scroll containers are follow-up.

## Clarifications required

- [x] ~~Confirm `ModalSurface` and `SlidePageSurface` may be centralized to `@beyo/ui` and the
  app-local copies deleted.~~ **Resolved (David, 2026-06-15): not intentionally divergent —
  centralize and clean up the local copies.**

## Acceptance criteria

1. A non-floating focused input inside a **slide page** is lifted clear of the keyboard (its
   scroll area honors `--keyboard-inset`) and returns to normal on dismiss.
2. A non-floating focused input inside a **modal** is lifted clear of the keyboard and returns
   to normal on dismiss.
3. A focused input in the **main app shell** (a normal tab page using the `TabOutlet` scroll
   wrapper) is scrollable above the keyboard and returns to normal on dismiss.
4. `ModalSurface` and `SlidePageSurface` exist in exactly one place (`@beyo/ui`); no app-local
   copies remain, and every app's `SurfaceRouteFrame` imports all three surfaces from `@beyo/ui`.
5. `FloatingKeyboardBar` owns the inline+floating duplication: the upholstery page declares the
   amount input and shortcut buttons **once**, with no in-page `invisible` toggle or duplicated
   `onValueChange`/`applyMultiplier`.
6. Tapping the closed-state input opens the keyboard and the floating bar appears with focus,
   with no observable keyboard flicker (focus transfer is synchronous via `useLayoutEffect`).
7. Tapping a shortcut updates the value and keeps the keyboard open; dismissing returns the
   sheet to its normal bottom-pinned layout with no stale Vaul inline styles.
8. `npm run typecheck` at the repo root reports zero errors and covers managers, workers,
   sellers, and the changed packages; sellers has its own `typecheck` script.

## Contracts and skills

### Contracts loaded

- `Frontend_architecture/28_surfaces.md`: surface = chrome; keyboard inset belongs in the surface
  scroll area, not feature content — governs the Modal/Slide changes and centralization.
- `Frontend_architecture/23_providers.md`: unchanged; `KeyboardInsetProvider` already conforms.
- `Frontend_architecture/08_hooks.md`: unchanged; `useVisualViewport` stays in `@beyo/hooks`.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Relational reads permitted: the three surface copies (diff local vs shared before centralizing),
  each app's `SurfaceRouteFrame` and `TabOutlet`, the upholstery page (refactor target), root and
  per-app `package.json` scripts.
- No pattern reads required — no new data-layer code.

### Skill selection

- Primary skill: none (UI primitive + surface chrome + tooling).
- Trigger terms: `keyboard, visualViewport, surface, floating bar`.
- Excluded alternatives: server-state / action skills — no data layer touched.

## Implementation plan

> Prerequisite: land `PLAN_keyboard_sheet_lift_hotfix_20260615` first (bottom-sheet lift +
> provider re-render fix). The steps below assume bottom sheets already lift and the provider no
> longer re-renders per frame.

1. **Centralize modal/slide surfaces.** Diff `apps/*/src/components/surfaces/ModalSurface.tsx`
   and `SlidePageSurface.tsx` against the `@beyo/ui` copies. If functionally equivalent: update
   each app's `SurfaceRouteFrame` to import `ModalSurface` and `SlidePageSurface` from `@beyo/ui`,
   then delete the app-local copies. If a real divergence exists, lift the difference into a prop
   on the shared surface (do not keep a fork). Confirm `@beyo/ui` exports both (it already does).

2. **Add the keyboard inset to the shared surfaces.**
   - `packages/ui/src/components/surfaces/SlidePageSurface.tsx`: change the scroll wrapper to
     `pb-[calc(var(--safe-bottom)_+_var(--keyboard-inset))]`.
   - `packages/ui/src/components/surfaces/ModalSurface.tsx`: same on its `overflow-y-auto` body;
     keep `max-h-[80dvh]` (the inset padding pushes the focused field above the keyboard within
     the scroll area).

3. **Add the keyboard inset to the main app shell.** In each app's `TabOutlet.tsx`, change the
   inner scroll wrapper from `h-full overflow-y-auto` to
   `h-full overflow-y-auto pb-[var(--keyboard-inset)]` (managers and workers). This is the single
   shared scroll container for normal tab pages.

4. **Upgrade `FloatingKeyboardBar` to own the pattern.** Replace the `children`-only API with a
   render-prop that the primitive renders in two places:
   - Signature: `renderControls(args: { inputRef: RefObject<HTMLInputElement | null>;
     preventFocusSteal: (e: MouseEvent<HTMLElement>) => void }) => ReactNode`.
   - When the keyboard is **closed**: render `renderControls` inline (in normal flow) so the
     field is visible and tappable to open the keyboard; pass a no-op ref.
   - When the keyboard is **open**: render the inline copy wrapped in `invisible` (to preserve
     layout height) **and** render `renderControls` again inside the body portal pinned at
     `bottom: var(--keyboard-inset)`, passing the real `inputRef` to the floating copy.
   - Focus transfer: in a `useLayoutEffect` keyed on the open transition, call
     `inputRef.current?.focus()` synchronously so the soft keyboard does not drop.
   - Keep `preventFocusSteal` exported and pass it through the render-prop args.
   - Remove the `canPortal` SSR guard (Vite SPA, no SSR).

5. **Refactor the consumer.** Rewrite `ItemUpholsteryAmountSheetPage.tsx` to declare the amount
   `NumberInput` + the `×0.25`/`×0.5` buttons **once** inside `renderControls`, wiring
   `ref={inputRef}`, `onMouseDown={preventFocusSteal}` on the buttons, and the existing
   `applyMultiplier`/`onValueChange` handlers. Delete the in-page second input, the `invisible`
   wrapper, and the `useKeyboardInset()`-driven visibility toggle (now owned by the primitive).

6. **Widen the validation gate.** Add `"typecheck": "tsc -b --noEmit"` to the sellers app
   `package.json`. Update the root `typecheck` script to run managers, workers, and sellers
   workspaces (and a package typecheck step for `@beyo/ui` / `@beyo/hooks`).

7. **Polish.** Align the sellers `KeyboardInsetProvider` mount with the managers/workers
   convention (mount it in the app's provider tree rather than ad hoc in `main.tsx`, if the
   sellers app has an equivalent provider component; otherwise leave a comment noting the
   intentional placement).

## Risks and mitigations

- Risk: This plan starts before the prerequisite hotfix is verified, and the lift-vs-padding
  split turns out wrong on-device.
  Mitigation: Do not begin this plan until `PLAN_keyboard_sheet_lift_hotfix_20260615` is landed
  and confirmed on a real phone.
- Risk: A local `ModalSurface`/`SlidePageSurface` copy has an app-specific tweak that silently
  disappears on centralization.
  Mitigation: Step 1 diffs before deleting; real differences become shared props, not forks.
  Gated by the clarification.
- Risk: The render-prop refactor changes `FloatingKeyboardBar`'s public API; any other consumer
  breaks.
  Mitigation: Only the upholstery page consumes it today (verified in review); refactor it in the
  same change. TypeScript will flag any missed consumer.
- Risk: `useLayoutEffect` focus still races on some Android keyboards.
  Mitigation: Synchronous pre-paint focus is the strongest in-browser option; keep the `>100px`
  open threshold; flag for on-device validation.
- Risk: Adding `pb-[var(--keyboard-inset)]` to a nested page that already has its own inner
  scroll container has no effect (the inner container scrolls instead).
  Mitigation: Documented as follow-up; the `TabOutlet` wrapper covers the common case, and any
  page with a bespoke scroll container can opt in by adding the same utility.

## Validation plan

- `npm run typecheck` (root, now covering managers + workers + sellers + packages): zero errors.
- Manual mobile (iOS Safari PWA standalone + Android Chrome):
  - Slide page with a text input → focus → input sits above keyboard → dismiss → normal layout.
  - Modal with a text input → same.
  - Main-app tab page form → focus → scrollable above keyboard → dismiss → normal.
  - Upholstery "Edit amount" → tap input → floating bar appears with focus, no flicker →
    shortcuts update value, keyboard stays open → dismiss → sheet normal, no stale inline styles
    on `[data-vaul-drawer]`.
- `npx playwright test --grep keyboard --project=mobile`: floating bar renders; no stale drawer
  inline styles after a synthetic viewport cycle (documented headless limitation).
- `npx playwright test --grep keyboard --project=desktop`: no regression to surface open/close.

## Review log

- `2026-06-15` `Claude`: Authored from the post-implementation review of
  PLAN_keyboard_aware_inputs_20260615 (gaps: surface coverage, primitive encapsulation, focus
  race, validation gate).
- `2026-06-15` `David`: Reported a keyboard-dismiss regression on the quantity sheet
  (`TaskDetailSlidePage`). Diagnosed as the missing bottom-sheet lift; split it into its own
  independently landable hotfix (`PLAN_keyboard_sheet_lift_hotfix_20260615`) to be verified
  on-device before this cleanup. This plan now depends on that hotfix.
- `2026-06-15` `Codex`: Implemented shared modal and slide centralization, full surface/main-shell
  keyboard inset coverage, `FloatingKeyboardBar` render-prop encapsulation, the upholstery page
  refactor, and the widened root typecheck gate. Summary and archive record written.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
