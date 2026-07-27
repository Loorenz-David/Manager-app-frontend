# SUMMARY_app_shell_surface_architecture_20260519

## Metadata

- Summary ID: `SUMMARY_app_shell_surface_architecture_20260519`
- Status: `summarized`
- Owner agent: `codex-gpt-5`
- Created at (UTC): `2026-05-19T17:17:42Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_app_shell_surface_architecture_20260519.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the Vite starter app with the managers app shell rooted at `src/app/App.tsx`.
- Added the foundational surface runtime: store, provider, slide surface, sheet surface, modal surface, and shared surface hooks.
- Added global providers, route lazy-loading, auth guard stubs, and minimal page stubs for `/`, `/sign-in`, and `*`.
- Added the local surface architecture companion at `architecture/28_surfaces_local.md`.
- Added the `@/` path alias, Tailwind theme tokens used by the shell primitives, and a `typecheck` script.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/`: app shell, providers, routing, surfaces, hooks, auth guards, shared libs, store, types, and stub pages created.
- `apps/managers-app/ManagerBeyo-app-managers/src/main.tsx`: moved root import to `src/app/App.tsx` and added the required `vaul-drawer-wrapper`.
- `apps/managers-app/ManagerBeyo-app-managers/src/index.css`: added app theme tokens and full-height root styling.
- `apps/managers-app/ManagerBeyo-app-managers/package.json`: added `typecheck`.
- `apps/managers-app/ManagerBeyo-app-managers/tsconfig.app.json`: added the `@/` path alias.
- `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts`: mirrored the `@/` alias in Vite.
- `architecture/28_surfaces_local.md`: documented the app-specific surface model.

## Contract adherence

- `architecture/01_architecture.md`: app bootstrap moved to `src/app/`, with router-level providers separated from global providers.
- `architecture/11_routing.md`: routes are centralized in `src/app/router.tsx` and page modules are lazy-loaded through `lazyRoute`.
- `architecture/23_providers.md`: `BreakpointProvider` and `SurfaceProvider` follow the provider/context boundary.
- `architecture/27_responsive.md`: implemented a single `BreakpointProvider` matchMedia source of truth.
- `architecture/28_surfaces.md`: implemented registry/store/provider/hooks and router-aware surface framing primitives.
- `architecture/28_surfaces_local.md`: applied the local `slide` and `sheet` extensions and excluded `drawer`.
- `architecture/30_dynamic_loading.md`: route modules and surface content use lazy boundaries with skeleton fallbacks.
- `architecture/31_animations.md`: Motion root setup and centralized transition tokens were added.
- `architecture/33_vaul_drawer.md`: `BottomSheetSurface` uses Vaul and the required background-scaling wrapper.

## Validation evidence

- `npm run typecheck`: pass
- `npm run build`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Surface registrations are still empty: the runtime is in place, but acceptance criteria that require opening real registered surfaces remain deferred until the first feature supplies registrations.
- URI-enabled surface restoration is not yet exercised end-to-end: `SurfaceRouteFrame` exists, but no feature route uses it yet.
- Auth is intentionally not integrated: `ProtectedRoute` is permissive in DEV so the shell can be built at `/` before backend auth wiring lands.
- Playwright validation is still deferred, matching the plan.

## Handoff notes (if needed)

- No backend handoff artifact required for this shell bootstrap.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_app_shell_surface_architecture_20260519_1717.md`
