# SUMMARY_PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527

## Metadata

- Summary ID: `SUMMARY_PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T07:37:23Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended the upholstery picker contract and cache keys to support backend `favorite`, `list_order`, `in_stock`, and `favorite` filtering semantics.
- Replaced the old upholstery picker flow/store with a query-driven controller that preloads in-stock, out-of-stock, and favorites lists, drives direction-aware body animation, and exposes favorite/reorder actions.
- Rebuilt the picker UI with quick-filter pills, inline favorite toggles, a reorder trigger, and a bottom-sheet DnD reorder surface backed by optimistic TanStack Query mutations.
- Follow-up correction attempt: rewired the reorder list so the grip icon is the actual dnd-kit activator via `setActivatorNodeRef`, moved sortable listeners onto the handle, and reduced pointer/touch activation thresholds for immediate drag start.
- Removed the redundant upholstery selection store usage from item/task/auth flows and switched the item upholstery field to resolve its selected record from React Query cache or the single-option fetch fallback.
- Added focused Vitest coverage for the new favorite/order action hooks, the updated upholstery card interaction, and the cache-backed item upholstery field behavior.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/types.ts`: added `favorite`, `list_order`, quick-filter types, and filter params.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-upholstery-picker-options.ts`: forwarded `in_stock` and `favorite` query params.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-toggle-upholstery-favorite.ts`: added single-card favorite PATCH client.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-update-upholstery-list-order.ts`: added list-order PATCH client.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-toggle-upholstery-favorite.ts`: added optimistic favorite mutation across picker/detail caches.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-update-upholstery-list-order.ts`: added optimistic list-order mutation with picker/detail invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/controllers/use-upholstery-picker.controller.ts`: added the query-driven picker controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryPickerHeader.tsx`: added the search + quick-filter header.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryCard.tsx`: converted the card to a composite action row with favorite and reorder buttons.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryDnDCard.tsx`: added the compact sortable reorder card.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx`: rewrote the picker slide around the new controller and animated filter body.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryReorderSheetPage.tsx`: added the bottom-sheet DnD reorder surface and then updated it to use a dedicated handle activator with immediate sensor thresholds.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/surfaces.ts`: registered the new reorder sheet surface.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/index.ts`: updated the public API and removed deprecated flow/store exports.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryField.tsx`: switched selected upholstery resolution to React Query cache and surface constants.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`: removed obsolete upholstery-store clearing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`: removed obsolete upholstery-store clearing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/actions/use-create-task.ts`: removed obsolete upholstery-store clearing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/api/use-sign-out.ts`: removed obsolete upholstery-store clearing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-toggle-upholstery-favorite.test.ts`: added favorite mutation tests.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-update-upholstery-list-order.test.ts`: added list-order mutation tests.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryCard.test.tsx`: added favorite button interaction coverage.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryField.test.tsx`: updated field coverage for cache-backed selection lookup.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/flows/use-upholstery-picker.flow.ts`: removed.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/store/upholstery-selection.store.ts`: removed.

## Contract adherence

- `architecture/05_server_state.md`: the new favorite and list-order actions keep optimistic cache logic inside dedicated mutation hooks and reconcile via invalidation on settle.
- `architecture/08_hooks.md`: the picker behavior now lives in a controller that aggregates queries and action hooks rather than in an ad hoc flow/store pair.
- `architecture/28_surfaces_local.md`: the reorder experience is registered as a `sheet` surface and opened through the shared surface manager.
- `architecture/31_animations.md`: the picker body uses `AnimatePresence` with direction-aware motion variants for filter transitions.

## Validation evidence

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npx vitest run src/features/upholstery/actions/use-toggle-upholstery-favorite.test.ts src/features/upholstery/actions/use-update-upholstery-list-order.test.ts src/features/upholstery/components/UpholsteryCard.test.tsx src/features/items/components/fields/ItemUpholsteryField.test.tsx`: pass
- Follow-up drag-handle wiring patch: `npm run typecheck` passed again after moving listeners to the handle and adding `setActivatorNodeRef`.

## Known gaps or deferred items

- Current blocker: the reorder interaction is still broken in manual use. Tapping and dragging the visible grip handle in the reorder sheet does not start a drag, even after the follow-up activator wiring change.
- Handoff focus for the next agent: inspect the runtime interaction between the reorder sheet surface, vaul sheet content, dnd-kit sensors/activators, and the handle button event path in `UpholsteryReorderSheetPage.tsx` + `UpholsteryDnDCard.tsx`.
- The plan’s broader Playwright scenarios for quick-filter network fan-out and reorder drag/drop were not added in this pass; validation is currently TypeScript plus focused Vitest coverage.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527_0737.md`
