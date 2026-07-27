# SUMMARY_PLAN_fix_auth_cookie_refresh_20260523

## Metadata

- Summary ID: `SUMMARY_PLAN_fix_auth_cookie_refresh_20260523`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-23T19:47:06Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_fix_auth_cookie_refresh_20260523.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a Vite dev-server `/api` proxy in the managers app so browser requests stay same-origin in development while the dev server forwards them to the backend target from `API_TARGET_URL`.
- Split the local API configuration into a server-only proxy target and a browser-facing `VITE_API_URL`, leaving the browser base empty in development and aligning the production env key with the key the app actually validates.
- Updated the API client and refresh-token flow to fall back to `window.location.origin` when `VITE_API_URL` is empty, which keeps URL construction valid in dev proxy mode.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts`: switched to function config with `loadEnv` and added the dev proxy for `/api`.
- `apps/managers-app/ManagerBeyo-app-managers/.env`: replaced the direct browser API origin with `API_TARGET_URL` plus an empty `VITE_API_URL`.
- `apps/managers-app/ManagerBeyo-app-managers/.env.production`: renamed `VITE_API_BASE_URL` to `VITE_API_URL`.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/env.ts`: relaxed env validation so `VITE_API_URL=''` is valid in dev proxy mode.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts`: added same-origin fallback for request URL construction.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/auth-token.ts`: added the same fallback for the refresh request.

## Contract adherence

- `architecture/03_environment.md`: browser code still reads only `VITE_` variables through the validated `env` module, while the server-only proxy target stays outside the browser bundle.
- `architecture/04_api_client.md` and `architecture/04_api_client_local.md`: the refresh singleton remains in `src/lib/auth-token.ts`, and the API client remains the shared HTTP layer with only URL-base handling adjusted for proxy mode.
- `architecture/12_auth.md` and `architecture/12_auth_local.md`: auth boot continues to rely on the refresh-cookie flow; this change fixes the development transport path without changing auth-store behavior.

## Validation evidence

- `npm run typecheck`: pass

## Known gaps or deferred items

- Manual browser validation against a live backend was not performed in this environment, so cookie persistence on reload and Vite proxy forwarding were not smoked here.
- No Playwright coverage was added for the auth-cookie reload scenario.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_fix_auth_cookie_refresh_20260523_1947.md`
