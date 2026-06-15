# SUMMARY_PLAN_keyboard_aware_inputs_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_keyboard_aware_inputs_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T10:27:04Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_keyboard_aware_inputs_20260615.md`
- Related intention/report: `docs/architecture/under_construction/intention/REPORT_keyboard_overlay_layout_bug_20260615.md`

## What was implemented

- Added a canonical `useVisualViewport()` hook in `@beyo/hooks` with `visualViewport` fallback guards, keyboard height calculation, open thresholding, and `requestAnimationFrame` event coalescing.
- Added `KeyboardInsetProvider` and `useKeyboardInset()` in `@beyo/ui`; the provider writes `--keyboard-inset` on `document.documentElement` and exposes keyboard state through context.
- Added the reusable `FloatingKeyboardBar` primitive with body portal rendering, fixed keyboard-inset positioning, focus retention through an optional input ref, and a `preventFocusSteal` helper for bar actions.
- Updated the shared `BottomSheetSurface` to disable Vaul `repositionInputs` globally and to pad its scroll area with `--keyboard-inset`.
- Centralized bottom sheet usage by switching managers/workers surface frames to import `BottomSheetSurface` from `@beyo/ui` and deleting the app-local bottom sheet copies.
- Mounted `KeyboardInsetProvider` in managers, workers, and sellers roots.
- Refactored `ItemUpholsteryAmountSheetPage` to use `useKeyboardInset()` and `FloatingKeyboardBar`, removing its local viewport hook and bespoke portal logic.

## Files changed

- `packages/hooks/src/use-visual-viewport.ts`: canonical visual viewport observer.
- `packages/hooks/src/index.ts`: exported `useVisualViewport`.
- `packages/ui/src/providers/KeyboardInsetProvider.tsx`: global keyboard inset provider and consumer hook.
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`: floating keyboard bar primitive and focus helper.
- `packages/ui/src/components/primitives/floating-keyboard-bar/index.ts`: primitive exports.
- `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`: disabled Vaul input repositioning and consumed `--keyboard-inset` in the scroll area.
- `packages/ui/src/index.ts`: exported the provider, consumer hook, and floating primitive.
- `packages/styles/src/index.css`: declared the default `--keyboard-inset`.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/providers.tsx`: mounted `KeyboardInsetProvider`.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/providers.tsx`: mounted `KeyboardInsetProvider`.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/main.tsx`: mounted `KeyboardInsetProvider`.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/SurfaceRouteFrame.tsx`: imported the shared bottom sheet.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/SurfaceRouteFrame.tsx`: imported the shared bottom sheet.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`: replaced the local keyboard prototype with the shared primitive.
- `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-visual-viewport.ts`: removed.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/BottomSheetSurface.tsx`: removed duplicate local surface.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/BottomSheetSurface.tsx`: removed duplicate local surface.

## Contract adherence

- `Frontend_architecture/28_surfaces.md`: applied the Vaul behavior change in the shared surface chrome rather than coupling it to feature content.
- `Frontend_architecture/23_providers.md`: implemented one provider for the keyboard-inset concern with a matching consumer hook.
- `Frontend_architecture/08_hooks.md`: placed the viewport observer in the shared hooks package and routed feature code through the provider context.

## Validation evidence

- `npm run typecheck`: pass.
- `rg` verification: only the shared `BottomSheetSurface` contains `repositionInputs={false}`; no app-local `use-visual-viewport` import remains.

## Known gaps or deferred items

- Real-device software keyboard validation remains manual because desktop/headless browser typechecks cannot reproduce mobile `visualViewport` keyboard shrink behavior.
- The root `npm run typecheck` script only typechecks `managerbeyo-app-managers`; workers and sellers were not included by that command.
- Follow-up hotfix: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_sheet_lift_hotfix_20260615.md` updated the bottom sheet from keyboard padding to keyboard lift and reduced provider re-renders.

## Handoff notes

- No backend handoff needed.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_keyboard_aware_inputs_20260615_1027.md`
