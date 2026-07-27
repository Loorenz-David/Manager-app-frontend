# SUMMARY_PLAN_workers_first_pwa_runtime_adoption_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_workers_first_pwa_runtime_adoption_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T15:55:47Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_workers_first_pwa_runtime_adoption_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added workers app dependencies for shared PWA runtime consumption: `@beyo/pwa` and `vite-plugin-pwa`.
- Configured workers `vite.config.ts` with `VitePWA` using prompt registration, app-owned manifest metadata, include assets, and workbox settings.
- Added workers PWA surface definitions and sheet pages:
  - `pwa-update` surface with update-first-close behavior
  - `pwa-install` surface with install prompt handling
- Registered workers PWA surfaces in the app surface registry.
- Replaced workers placeholder `PwaProvider` usage in `RootRoute.tsx` with `@beyo/pwa` `PwaProvider` and app-owned surface opener callbacks.
- Deleted the placeholder `src/features/pwa/PwaProvider.tsx`.
- Added required PWA assets to workers `public/` and added `apple-touch-icon` to workers `index.html`.
- Fixed integration issues discovered by typecheck:
  - switched PWA sheet hook imports to `@beyo/hooks`
  - ensured `virtual:pwa-register/react` declaration visibility in `@beyo/pwa` provider via reference directive.

## Files changed

- `apps/workers-app/ManagerBeyo-app-workers/package.json`
- `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts`
- `apps/workers-app/ManagerBeyo-app-workers/index.html`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/RootRoute.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/providers/SurfaceProvider.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/index.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/pages/PwaUpdateSheetPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/pages/PwaInstallSheetPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/PwaProvider.tsx` (deleted)
- `apps/workers-app/ManagerBeyo-app-workers/public/apple-touch-icon.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-48x48.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-72x72.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-96x96.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-144x144.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-192x192.png`
- `apps/workers-app/ManagerBeyo-app-workers/public/pwa-512x512.png`
- `packages/pwa/src/providers/PwaProvider.tsx`
- `package-lock.json`

## Validation evidence

- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: pass
- `npm run build` (in workers app): pass, manifest/SW generated (`dist/manifest.webmanifest`, `dist/sw.js`)

## Known gaps or deferred items

- Manual on-device validation (install flow and update prompt flow) remains pending.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_workers_first_pwa_runtime_adoption_20260530_1555.md`
