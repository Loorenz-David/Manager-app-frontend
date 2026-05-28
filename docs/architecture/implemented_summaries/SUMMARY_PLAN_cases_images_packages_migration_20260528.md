# SUMMARY_PLAN_cases_images_packages_migration_20260528

## Outcome

Implemented `PLAN_cases_images_packages_migration_20260528` end-to-end.

- Created shared package `@beyo/images` in `packages/images` with copied feature sources, import remapping, and a complete package barrel.
- Created shared package `@beyo/cases` in `packages/cases` with copied feature sources, app-specific exclusions, import remapping, and a complete package barrel.
- Decoupled `packages/cases/src/controllers/use-case-conversation.controller.ts` from app-specific task/routes imports.
- Added workers app dependencies for `@beyo/images`, `@beyo/cases`, and required runtime libraries.
- Added Tailwind `@source` entries for `packages/images/src` and `packages/cases/src`.
- Added `buildCaseConversationRoute` in workers routes.
- Added workers case surface registrations in `src/features/cases/surfaces.ts`.
- Replaced workers cases pages with package-backed implementations.
- Added workers case surface pages:
  - `CaseConversationSlidePage`
  - `CaseMessageActionsSheetPage`
- Updated workers surface registry to merge `imageSurfaces` and `caseSurfaces`.

## Key implementation notes

- `packages/cases` intentionally does not include `surfaces.ts`; package surface IDs live in `surface-ids.ts` and app-level surface registrations stay in app code.
- Workers task info surface remains intentionally unregistered (`CASE_TASK_INFO_SHEET_SURFACE_ID`) per plan scope.
- `@beyo/images` barrel exports were aligned to actual helper names in `types.ts` (`toImageViewModel`).

## Validation results

All required checks passed:

- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: pass
- `npm run build --workspace=apps/workers-app/ManagerBeyo-app-workers`: pass
- `grep -r "@/features/tasks\|@/lib/routes\|@/store/auth.store" packages/cases/src/ packages/images/src/`: no matches
- `ls -la node_modules/@beyo/images`: symlink to `../../packages/images`
- `ls -la node_modules/@beyo/cases`: symlink to `../../packages/cases`

## Files completed

Primary touched areas:

- `packages/images/**`
- `packages/cases/**`
- `apps/workers-app/ManagerBeyo-app-workers/package.json`
- `apps/workers-app/ManagerBeyo-app-workers/src/index.css`
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseMessageActionsSheetPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`
