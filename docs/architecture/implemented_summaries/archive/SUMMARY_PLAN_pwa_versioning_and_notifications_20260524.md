# SUMMARY_PLAN_pwa_versioning_and_notifications_20260524

## Metadata

- Summary ID: `SUMMARY_PLAN_pwa_versioning_and_notifications_20260524`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-24T06:54:24Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_pwa_versioning_and_notifications_20260524.md`
- Related debug plan (optional): `—`

## What was implemented

- Installed `vite-plugin-pwa` in the managers app and configured Vite to generate a prompt-based service worker with outdated-cache cleanup and a standalone manifest.
- Added branded Android and iOS install assets in `public/` so the generated manifest and Apple touch icon metadata point at real image files.
- Implemented a `pwa` feature module with a provider that listens for service-worker refresh availability and `beforeinstallprompt`, then routes both flows through the existing surface system.
- Added two bottom-sheet surfaces: one for "New version available" with an explicit update action, and one for "Install app" that opens the browser install prompt once per page session when the app is not already running standalone.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/package.json`: added `vite-plugin-pwa` as a dev dependency.
- `apps/managers-app/ManagerBeyo-app-managers/package-lock.json`: locked the new PWA dependency tree.
- `apps/managers-app/ManagerBeyo-app-managers/public/`: added `apple-touch-icon.png` and `pwa-48x48.png`, `pwa-72x72.png`, `pwa-96x96.png`, `pwa-144x144.png`, `pwa-192x192.png`, `pwa-512x512.png`.
- `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts`: added `VitePWA` with manifest metadata, asset inclusion, and Workbox update behavior.
- `apps/managers-app/ManagerBeyo-app-managers/tsconfig.app.json`: added `vite-plugin-pwa/client` types.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx`: mounted `PwaProvider` under `SurfaceProvider`.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: registered the new PWA surfaces.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/`: added the provider, surface registrations, and the install/update sheet pages.

## Contract adherence

- `architecture/15_feature_structure.md`: the new behavior lives in a dedicated `src/features/pwa` module with a small public export surface.
- `architecture/28_surfaces.md` and `28_surfaces_local.md`: both user-facing prompts were implemented as `sheet` surfaces and registered through the existing `SurfaceProvider` registry.
- `architecture/06_client_state.md`: no new global Zustand store was introduced; the implementation reuses `useSurfaceStore` and local refs/state inside the provider.

## Validation evidence

- `npm run typecheck`: pass
- `npm run build`: pass
- Build output included `dist/manifest.webmanifest` and `dist/sw.js`

## Known gaps or deferred items

- Manual browser verification of the install prompt and update flow was not performed in this environment.
- No Playwright coverage was added for the install/update sheets or service-worker lifecycle.
- The generated build still reports an existing large-chunk warning for the main bundle; this change did not address bundle splitting.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_pwa_versioning_and_notifications_20260524_0654.md`
