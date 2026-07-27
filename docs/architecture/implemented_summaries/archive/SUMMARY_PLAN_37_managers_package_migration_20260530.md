# SUMMARY_PLAN_37_managers_package_migration_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_37_managers_package_migration_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T10:06:11Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_37_managers_package_migration_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added managers app dependencies for shared packages: `@beyo/styles`, `@beyo/api-client`, `@beyo/auth`, `@beyo/cases`, `@beyo/hooks`, `@beyo/images`.
- Migrated styling bootstrap in `src/index.css` to `@import "@beyo/styles"`, added package `@source` paths, and removed duplicated theme/reset/safe-area definitions.
- Converted `src/lib/api-client.ts`, `src/lib/auth-token.ts`, and `src/lib/env.ts` into thin re-export proxies to `@beyo/api-client`.
- Migrated auth integration to `@beyo/auth`, including required prop wiring for `AuthProvider`, `GuestRoute`, `ProtectedRoute`, and `SignInForm`.
- Backed up and removed local `src/features/auth/`.
- Backed up full local `src/features/cases/`, created app-local components in `src/components/cases/` (`CaseTaskInfoCard`, `CaseTaskInfoSheetContent`), and made `CaseTaskInfoSheetContent` self-fetching.
- Rewrote `src/features/cases/surfaces.ts` as lean app-level registrations using `@beyo/cases` IDs/types and `lazyWithPreload` from `@beyo/ui`.
- Migrated case pages to `@beyo/cases` exports (`CasesRouteEntry`, `CaseConversationRouteEntry`, `CaseConversationRouteHydrator`, message actions ids/events/types).
- Updated `src/pages/cases/CaseTaskInfoSheetPage.tsx` to render via package-provided `renderTaskCard` slot.
- Updated `src/app/surface-registry.ts` to import case surfaces from `@/features/cases/surfaces` and image surfaces from `@beyo/images`.
- Migrated non-image feature consumers and task-layer image types/constants/helpers to `@beyo/images`.
- Backed up and removed local `src/features/images/`.
- Migrated all remaining `lazyWithPreload` imports to `@beyo/ui` and deleted `src/utils/lazy-with-preload.ts`.
- Added app-level `src/test-utils/query-client.tsx` and re-pointed affected tests that previously imported deleted `src/features/images/test-utils`.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/package.json`
- `apps/managers-app/ManagerBeyo-app-managers/src/index.css`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/auth-token.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/env.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/app/router.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/auth/SignInPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CasesPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTaskInfoSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseMessageActionsSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/cases/CaseTaskInfoCard.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/cases/CaseTaskInfoSheetContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskImagesSection.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/date/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-tasks-view.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/use-list-tasks-query.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/task-list-images.store.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/actions/use-create-task.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/test-utils/query-client.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.test.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryField.test.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-toggle-upholstery-favorite.test.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-update-upholstery-list-order.test.ts`

## Validation evidence

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npm run build` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npx playwright test --project=mobile`: not run (out of scope for this migration)

## Known gaps or deferred items

- The explicit conversation-opener wiring from plan step 22 (`surface.open(CASE_CONVERSATION_SURFACE_ID, ...)`) no longer exists in managers `src/` after migration to package-owned cases route/controller flow; conversation surface openers are now forwarded via `CaseConversationSlidePage` surface props.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_37_managers_package_migration_20260530.md`
