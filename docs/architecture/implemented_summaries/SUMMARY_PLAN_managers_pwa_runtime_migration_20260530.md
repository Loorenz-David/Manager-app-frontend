# SUMMARY_PLAN_managers_pwa_runtime_migration_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_managers_pwa_runtime_migration_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T15:58:28Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_managers_pwa_runtime_migration_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added `@beyo/pwa` to managers app dependencies and synced workspace install.
- Replaced managers local `PwaProvider` usage in `RootRoute.tsx` with `@beyo/pwa` `PwaProvider` and app-owned `pwaSurfaceOpeners` callbacks.
- Migrated managers PWA surface prop ownership to shared package types by importing/re-exporting `PwaUpdateSurfaceProps` and `PwaInstallSurfaceProps` from `@beyo/pwa`.
- Updated managers PWA sheet responsibilities:
  - update sheet closes its surface before awaiting `onUpdate()`
  - install sheet closes its surface after awaiting `onInstall()`.
- Removed managers local provider implementation:
  - deleted `src/features/pwa/providers/PwaProvider.tsx`
  - removed `PwaProvider` export from managers PWA feature barrel.
- Verified no remaining references to managers local provider path.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/package.json`
- `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/pages/PwaUpdateSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/pages/PwaInstallSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/index.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/providers/PwaProvider.tsx` (deleted)
- `package-lock.json`

## Validation evidence

- `npm run typecheck --workspace=apps/managers-app/ManagerBeyo-app-managers`: pass
- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: pass
- `npm run build` (in managers app): pass (including generated PWA manifest/SW)
- `rg "features/pwa/providers|from.*features/pwa.*PwaProvider" apps/managers-app/ManagerBeyo-app-managers/src -n`: no matches

## Known gaps or deferred items

- Manual device regression for update/install UX remains recommended (not executed in this pass).

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_managers_pwa_runtime_migration_20260530_1558.md`
