# SUMMARY_api_client_auth_layer_20260520

## Metadata

- Summary ID: `SUMMARY_api_client_auth_layer_20260520`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T14:12:30Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_api_client_auth_layer_20260520.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the managers app API auth foundation: validated environment config, in-memory access-token storage, refresh singleton, JWT claim decoding, and the shared `apiClient` request wrapper with 401 refresh-retry handling.
- Replaced the broken auth store so it now carries identity only, never the access token, and added the auth hooks, sign-in mutation, sign-out mutation, session-restoring `AuthProvider`, and clean route guards.
- Wired the root route to the auth provider and connected the sign-in page to the new mutation so the implemented auth flow is reachable from the routed UI.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/.env`: added the local default `VITE_API_URL`.
- `apps/managers-app/ManagerBeyo-app-managers/src/vite-env.d.ts`: added the Vite env augmentation for `VITE_API_URL`.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/env.ts`: added Zod-based environment validation.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/auth-token.ts`: added module-owned access-token storage, refresh singleton, session init, and JWT claim decoding.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts`: added the typed HTTP client, `ApiRequestError`, status-code mapping, and session-expiry event dispatch.
- `apps/managers-app/ManagerBeyo-app-managers/src/types/api.ts`: aligned the API error schema with the backend error envelope.
- `apps/managers-app/ManagerBeyo-app-managers/src/store/auth.store.ts`: replaced token-in-store state with contract-compliant auth identity state and selectors.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/api/use-sign-in.ts`: added the sign-in mutation for `/api/v1/auth/sign-in`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/api/use-sign-out.ts`: added the sign-out mutation for `/api/v1/auth/logout`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/hooks/use-auth.ts`: added the public auth hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/components/AuthProvider.tsx`: added boot-time session restoration and session-expired handling.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/components/ProtectedRoute.tsx`: removed the DEV bypass and switched to the contract guard behavior.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/auth/index.ts`: exported the new auth provider, hooks, and mutations.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx`: wrapped the route tree with `AuthProvider`.
- `apps/managers-app/ManagerBeyo-app-managers/src/main.tsx`: imported the env validator at app startup.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/auth/SignInPage.tsx`: replaced the placeholder page with a working sign-in form that calls the new mutation.

## Contract adherence

- `architecture/03_environment.md`: `import.meta.env` is now validated once in `src/lib/env.ts`, with app startup importing the validated env module.
- `architecture/04_api_client.md`: only `src/lib/auth-token.ts` and `src/lib/api-client.ts` call `fetch`; access-token storage is in-memory only; refresh failures dispatch `auth:session-expired`.
- `architecture/06_client_state.md`: the auth store now contains identity state only and no token persistence.
- `architecture/12_auth.md`: implemented the auth provider, store, sign-in/sign-out hooks, public `useAuth` hook, and protected/guest route behavior.
- `architecture/13_errors.md`: HTTP-layer failures are normalized into `ApiRequestError`.
- `task_system/frontend_contract_goal_mapping_guide.md`: implementation-file reads were limited to app-specific relational reads while structure decisions came from the contracts.

## Validation evidence

- `npm run typecheck`: pass
- `npm run build`: pass
- `npx playwright test --project=mobile`: not run; this package uses `mobile-chrome` / `desktop-chrome` project names, and `tests/playwright/` currently contains no specs.
- `npx playwright test --project=desktop`: not run; `tests/playwright/` currently contains no specs.

## Known gaps or deferred items

- No automated Playwright coverage exists yet for auth boot, sign-in, or session-expiry flows in this package.
- Manual browser validation against a live backend was not performed in this environment, so refresh-cookie restoration and mid-session expiry remain un-smoked here.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_api_client_auth_layer_20260520_1412.md`
