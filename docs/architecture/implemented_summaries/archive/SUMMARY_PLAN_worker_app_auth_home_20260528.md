# SUMMARY_PLAN_worker_app_auth_home_20260528

## Outcome

Implemented `PLAN_worker_app_auth_home_20260528` end-to-end for the workers app.

- Wired `@beyo/*` shared packages into the workers app.
- Added missing peer/runtime dependencies and typecheck script in workers `package.json`.
- Added Tailwind v4 Vite plugin and `@` path alias configuration.
- Replaced workers `src/index.css` with shared styles import.
- Added shared-package bridge files for lib/providers/surfaces/ui.
- Added auth wrappers (`AuthProvider`, `GuestRoute`, `ProtectedRoute`) and PWA stub.
- Added bottom tab shell component and route/page scaffolds (home + stubs).
- Added Playwright auth coverage at `tests/playwright/auth.spec.ts`.

## Key implementation notes

- `tsconfig.app.json` needed `ignoreDeprecations: "6.0"` because `baseUrl` deprecation is surfaced by TypeScript 6.
- Workers build CSS import changed to `@import "@beyo/styles"` (package export path) so Vite build succeeds.
- Sign-in page uses `appScope="admin"` for backend compatibility with current auth contract.
- Playwright origin was aligned to `localhost:5173` to match backend CORS allowlist and unblock auth redirect tests.

## Validation results

All required gates passed:

- `npm run typecheck` (workers app): pass
- `npm run build` (workers app): pass
- `npm run test:e2e` (workers app): pass (`14 passed`)
- `npx playwright test tests/playwright/auth.spec.ts`: pass on mobile + desktop

## Files completed

Plan-specified app files were created/updated across:

- `apps/workers-app/ManagerBeyo-app-workers/package.json`
- `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts`
- `apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json`
- `apps/workers-app/ManagerBeyo-app-workers/src/index.css`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/*`
- `apps/workers-app/ManagerBeyo-app-workers/src/providers/*`
- `apps/workers-app/ManagerBeyo-app-workers/src/components/*`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/*`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/*`
- `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/auth.spec.ts`
