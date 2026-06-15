# SUMMARY_PLAN_keyboard_aware_inputs_corrections_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_keyboard_aware_inputs_corrections_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T11:24:20Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_keyboard_aware_inputs_corrections_20260615.md`
- Predecessor summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_sheet_close_focus_hotfix_20260615.md`

## What was implemented

- Centralized modal and slide surfaces onto the shared `@beyo/ui` implementations and deleted the remaining app-local copies.
- Added `--keyboard-inset` padding to shared slide and modal surface scroll containers, and to the managers/workers main tab scroll wrappers.
- Reworked `FloatingKeyboardBar` so it owns the inline plus floating duplication through a render-prop API and performs synchronous `useLayoutEffect` focus transfer on keyboard-open transitions.
- Refactored `ItemUpholsteryAmountSheetPage` to declare its amount input and shortcut controls once through the new primitive API.
- Added a sellers `typecheck` script and widened the root `typecheck` gate to managers, workers, sellers, `@beyo/ui`, and `@beyo/hooks`.
- Kept the sellers `KeyboardInsetProvider` at the root with an explicit note because that app still has no provider tree.

## Files changed

- `packages/ui/src/components/surfaces/ModalSurface.tsx`: keyboard inset padding in modal scroll content.
- `packages/ui/src/components/surfaces/SlidePageSurface.tsx`: keyboard inset padding in slide-page scroll content.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/TabOutlet.tsx`: main shell keyboard inset padding.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/TabOutlet.tsx`: main shell keyboard inset padding.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/SurfaceRouteFrame.tsx`: import all surfaces from `@beyo/ui`.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/SurfaceRouteFrame.tsx`: import all surfaces from `@beyo/ui`.
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`: render-prop API, inline-plus-floating ownership, synchronous focus transfer.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`: single declaration of the amount controls through the primitive.
- `apps/selleres-app/ManagerBeyo-app-sellers/package.json`: added `typecheck`.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/main.tsx`: documented intentional root-level provider mount.
- `package.json`: widened root `typecheck`.
- Deleted app-local modal/slide copies under managers and workers.

## Contract adherence

- `Frontend_architecture/28_surfaces.md`: moved keyboard inset handling into shared surface chrome and removed app-level surface forks.
- `Frontend_architecture/23_providers.md`: left `KeyboardInsetProvider` public shape unchanged.
- `Frontend_architecture/08_hooks.md`: left `useVisualViewport` in `@beyo/hooks` unchanged.

## Validation evidence

- `npm run typecheck`: pass.
- Static verification: no app-local `ModalSurface` or `SlidePageSurface` files remain; managers and workers `SurfaceRouteFrame` now import all surfaces from `@beyo/ui`.

## Known gaps or deferred items

- Manual mobile validation remains required for the slide, modal, main-shell, and floating-bar keyboard behaviors because headless checks cannot reproduce the software keyboard.
- `npx playwright test --grep keyboard --project=mobile` and `--project=desktop` were not run in this turn; the requested gate was `npm run typecheck`.

## Handoff notes

- No backend handoff needed.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_keyboard_aware_inputs_corrections_20260615_1124.md`
