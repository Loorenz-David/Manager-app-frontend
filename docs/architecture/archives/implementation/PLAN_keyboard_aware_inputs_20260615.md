# PLAN_keyboard_aware_inputs_20260615

## Metadata

- Plan ID: `PLAN_keyboard_aware_inputs_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T10:27:04Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/REPORT_keyboard_overlay_layout_bug_20260615.md`

## Goal and intent

- Goal: Establish one global, generic keyboard-aware input system that (a) keeps any
  focused input correctly laid out above the mobile software keyboard in every surface
  (Vaul bottom sheets, modals, slide pages) **and** the main app shell, and (b) provides
  a reusable "floating control bar pinned above the keyboard" affordance for inputs that
  opt into it. The first consumer is `ItemUpholsteryAmountSheetPage`.
- Business/user intent: The app is used primarily on phones. Today the upholstery amount
  sheet's keyboard prototype corrupts the bottom-sheet layout after the keyboard closes
  (stale Vaul inline styles — see the report). The fix must be reliable and reusable
  everywhere, not a per-page patch.
- Non-goals:
  - Do not redesign the Surface Manager, registry, routing, or `dvh` shell architecture.
  - Do not change any query/action/domain contract — this is UI/layout layer only.
  - Do not change the upholstery business logic (multiplier math, save flow, warning).
  - Do not add snap-point behavior to Vaul drawers.

## Scope

- In scope:
  - **Single source of truth for keyboard geometry** — promote the prototype hook to a
    canonical `useVisualViewport` in `@beyo/hooks`.
  - **Global provider** `KeyboardInsetProvider` (in `@beyo/ui`) mounted once per app at the
    root, which runs the viewport observer a single time and publishes both a React context
    (`useKeyboardInset()`) and a CSS custom property `--keyboard-inset` on the document
    element. The CSS var is the generic mechanism that lets any layout (main app or surface)
    become keyboard-aware with pure CSS, no per-input JS.
  - **Neutralize Vaul's competing keyboard handling**: pass `repositionInputs={false}` on
    every `BottomSheetSurface` `Drawer.Root` (the shared `@beyo/ui` copy and each app's local
    copy), and make the sheet's scroll area consume `--keyboard-inset` instead. This removes
    the dual-authority conflict and the stale inline `height`/`bottom` styles at the root.
  - **Reusable floating affordance** `FloatingKeyboardBar` primitive (in `@beyo/ui`) that
    portals its children to a fixed container pinned at `bottom: var(--keyboard-inset)` only
    while the keyboard is open, and encapsulates z-index, safe-area, pointer-events, and the
    focus-retention helpers (so consumers never hand-roll the portal/focus juggling again).
  - **Refactor `ItemUpholsteryAmountSheetPage`** to consume the new primitive and provider,
    deleting its local `use-visual-viewport.ts` and the bespoke portal/focus logic.
  - Wire the provider into all three apps (`managers`, `workers`, `sellers`).
- Out of scope:
  - Converting other existing inputs to the floating-bar pattern (generic non-floating
    behavior is delivered via `--keyboard-inset`, but per-feature opt-in floating bars are
    follow-up work).
  - Touching `ModalSurface` / `SlidePageSurface` internals beyond confirming they inherit the
    `--keyboard-inset` mechanism (no Vaul there, so no repositioning conflict).
- Assumptions:
  - `window.visualViewport` is available in the target PWA runtimes (iOS Safari 13.4+,
    Android Chrome 62+); a no-op fallback keeps SSR/older runtimes safe.
  - `NumberInput` is `forwardRef<HTMLInputElement, NumberInputProps>` (confirmed in both
    `@beyo/ui` and the managers local copy).
  - Each app already wraps the tree in `app/providers.tsx` (confirmed) and renders into
    `<div vaul-drawer-wrapper>` at `main.tsx` (confirmed).
  - **Decided (David, 2026-06-15):** this system lives in the shared packages and the apps
    **import** it (`@beyo/hooks` / `@beyo/ui`) rather than re-copying it locally. One
    implementation, one fix point, no cross-app drift.

## Clarifications required

- [x] ~~Apps import this system from `@beyo/hooks` / `@beyo/ui` rather than copying it locally.~~
  **Resolved (David, 2026-06-15): yes — shared packages, imported, no local copies.**
- [x] Confirm `repositionInputs={false}` may be applied to **all** bottom sheets globally.
  **Resolved by implementation audit (Codex, 2026-06-15): managers/workers route bottom
  sheets now import the shared `@beyo/ui` surface, app-local copies were removed, and
  the sellers scaffold has no local bottom-sheet surface.**

## Acceptance criteria

1. Opening the upholstery "Edit amount" sheet, typing a value, and dismissing the keyboard
   leaves the sheet pinned to the bottom at its normal height — **no stale inline `height`
   or `bottom` remains on the `[data-vaul-drawer]` node** (verify in devtools).
2. While the keyboard is open in that sheet, a compact bar with the `NumberInput` and the
   `× 0.25` / `× 0.5` shortcuts is pinned directly above the keyboard and fully tappable;
   tapping a shortcut updates the value and keeps the keyboard open.
3. Any plain input inside a bottom sheet (no floating bar) stays visible above the keyboard
   because the sheet scroll area honors `--keyboard-inset`; closing the keyboard restores
   the original layout with no jump.
4. A focused input in the **main app shell** (outside any surface) remains scrollable into
   view above the keyboard via `--keyboard-inset`; no layout corruption on dismiss.
5. `window.visualViewport` is observed exactly once globally (the provider), not per input.
6. `repositionInputs={false}` is set on every `BottomSheetSurface`, and Vaul no longer writes
   inline `height`/`bottom` on keyboard events.
7. TypeScript reports zero errors across the affected packages and apps.

## Contracts and skills

### Contracts loaded

- `Frontend_architecture/28_surfaces.md`: surface = chrome (animation, scroll area) and must
  not couple to feature content; confirms `BottomSheetSurface` is the correct seam for the
  Vaul `repositionInputs` change and the inset-aware scroll area.
- `Frontend_architecture/23_providers.md`: provider pattern (one provider per concern, exports
  Provider + consumer hook only) — governs `KeyboardInsetProvider`.
- `Frontend_architecture/08_hooks.md`: hook layering — governs the canonical `useVisualViewport`
  placement in `@beyo/hooks`.

### Local extensions loaded

- None.

### File read intent — pattern vs. relational

- Relational reads permitted: `@beyo/hooks` `BreakpointProvider.tsx` (precedent for a global
  cross-cutting provider and its app wiring), `NumberInput.tsx` (confirm ref forwarding and
  props), each app's `app/providers.tsx` and `main.tsx` (confirm mount points), the three
  `BottomSheetSurface.tsx` copies (confirm `Drawer.Root` props and scroll-area markup),
  `packages/styles/src/index.css` (confirm where `--safe-*` vars are declared).
- No pattern reads required — no new query/action/controller/DTO is introduced.

### Skill selection

- Primary skill: none (UI/layout primitive + provider work).
- Trigger terms: `keyboard, visualViewport, vaul, bottom sheet, floating bar`.
- Excluded alternatives: server-state / action-hook skills — no data layer touched.

## Implementation plan

1. **Declare the CSS var default.** In `packages/styles/src/index.css`, add
   `--keyboard-inset: 0px;` alongside the existing `--safe-*` declarations so every layout can
   reference it unconditionally.

2. **Canonical hook.** Create `packages/hooks/src/use-visual-viewport.ts` based on the
   prototype hook, hardened: guard missing `visualViewport`; compute
   `keyboardHeight = max(0, window.innerHeight - (vv.height + vv.offsetTop))`; expose
   `{ keyboardHeight, isKeyboardOpen, viewportHeight, offsetTop }`; keep the `> 100px` open
   threshold; coalesce rapid `resize`/`scroll` events with a single `requestAnimationFrame`.
   Export it from `packages/hooks/src/index.ts`.

3. **Global provider.** Create `packages/ui/src/providers/KeyboardInsetProvider.tsx`:
   - Runs `useVisualViewport()` once.
   - Writes `document.documentElement.style.setProperty('--keyboard-inset', \`${keyboardHeight}px\`)`
     in an effect (and resets to `0px` on cleanup / when closed).
   - Provides `{ keyboardHeight, isKeyboardOpen }` via context; exports `KeyboardInsetProvider`
     and `useKeyboardInset()` only (per `23_providers.md`). Export both from
     `packages/ui/src/index.ts`.

4. **Mount the provider in every app.** Add `<KeyboardInsetProvider>` high in each app's
   `app/providers.tsx` (managers, workers, sellers), wrapping `children` so both the app shell
   and all portaled surfaces are inside one observer.

5. **Floating primitive.** Create
   `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`
   (+ `index.ts`, + export from `packages/ui/src/index.ts`):
   - Reads `useKeyboardInset()`. Renders nothing when the keyboard is closed.
   - When open, `createPortal` into `document.body` a `fixed inset-x-0` container styled with
     `bottom: var(--keyboard-inset)`, high z-index, top border/shadow, `pointer-events-auto`,
     and bottom safe-area padding.
   - Encapsulates focus retention: expose a `preventFocusSteal` helper (applies
     `onMouseDown={(e) => e.preventDefault()}`) for interactive children, and accept an optional
     `inputRef` it refocuses when the keyboard transitions open (the proven prototype behavior),
     so consumers never re-implement the focus juggling.
   - Document the constraint: the floating input is a **distinct input instance** from any
     in-flow input (reparenting a focused input blurs it), so consumers bind both to the same
     controlled state and hide the in-flow copy while the bar is active.

6. **Neutralize Vaul.** Apply the fix in the shared
   `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`:
   - Add `repositionInputs={false}` to `Drawer.Root`.
   - Make the scroll container keyboard-aware: change its bottom padding to
     `pb-[calc(var(--safe-bottom)+var(--keyboard-inset))]` (or equivalent) so a non-floating
     focused input scrolls clear of the keyboard without Vaul resizing the drawer.
   - **Centralization:** the apps currently render their own local
     `components/surfaces/BottomSheetSurface.tsx` copies rather than the shared one. Per the
     import decision, first diff each local copy against the shared one; if they are functionally
     equivalent, point each app's `SurfaceRouteFrame` at the shared `@beyo/ui` `BottomSheetSurface`
     and delete the local copies, so this fix lives in exactly one file. If a local copy has a
     genuine app-specific divergence, parameterize the shared surface (prop) rather than keeping
     a fork. Either way, no app ends up with a copied surface that still owns the Vaul props.

7. **Refactor the consumer.** Rewrite `ItemUpholsteryAmountSheetPage.tsx` to:
   - Use `useKeyboardInset()` + `FloatingKeyboardBar` instead of the local hook and hand-built
     portal; keep the user-triggered input-mode behavior.
   - Keep the single in-flow `NumberInput` (hidden via `invisible` while keyboard open) and the
     floating `NumberInput` inside `FloatingKeyboardBar`, both bound to `amountMeters`.
   - Move the multiplier buttons into the bar via the primitive's `preventFocusSteal` helper;
     keep `applyMultiplier` re-focusing the floating input.
   - Delete `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-visual-viewport.ts`.

8. **Verify** types and behavior (see Validation plan); confirm no other importer referenced
   the deleted local hook (`grep`).

## Risks and mitigations

- Risk: A bottom sheet somewhere relies on Vaul's `repositionInputs` auto-resize, and disabling
  it globally regresses that sheet.
  Mitigation: Blocked by clarification #2; the `--keyboard-inset` scroll padding replaces the
  behavior generically; audit current sheets with focusable inputs before rollout.
- Risk: Multiple `visualViewport` observers (provider + any leftover hook usage) double-fire.
  Mitigation: Provider is the single observer; delete the app-local hook and route all reads
  through `useKeyboardInset()` / the CSS var.
- Risk: Reparent/focus flicker when transitioning the upholstery input into the floating bar.
  Mitigation: Distinct-input + shared-state model with `preventFocusSteal` and refocus-on-open,
  exactly as the prototype proved, now centralized in the primitive.
- Risk: Android Chrome fires `resize` mid-animation causing inset jitter.
  Mitigation: `requestAnimationFrame` coalescing in the hook; `> 100px` open threshold.
- Risk: `--keyboard-inset` left non-zero if the provider unmounts mid-keyboard.
  Mitigation: Effect cleanup resets the property to `0px`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (packages + all three apps).
- Manual mobile (iOS Safari PWA standalone + Android Chrome): open upholstery "Edit amount" →
  tap input → floating bar appears above keyboard → shortcuts update value, keyboard stays open
  → dismiss → sheet returns to normal bottom-pinned layout; inspect `[data-vaul-drawer]` for
  absence of stale inline `height`/`bottom`.
- `npx playwright test --grep keyboard --project=mobile`: floating bar renders and the drawer
  node carries no leftover inline `height`/`bottom` after a simulated `visualViewport` resize
  cycle (synthetic, since headless Chromium has no soft keyboard — documented limitation).
- `npx playwright test --grep keyboard --project=desktop`: no regression to sheet open/close.

## Review log

- `2026-06-15` `Claude`: Initial plan authored from REPORT_keyboard_overlay_layout_bug_20260615.
- `2026-06-15` `David`: Confirmed the system lives in shared packages and apps import it (no local
  copies); plan updated to centralize `BottomSheetSurface` accordingly.
- `2026-06-15` `Codex`: Implemented shared keyboard inset system, floating keyboard bar,
  shared bottom-sheet Vaul neutralization, first upholstery consumer, summary, and archive.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
