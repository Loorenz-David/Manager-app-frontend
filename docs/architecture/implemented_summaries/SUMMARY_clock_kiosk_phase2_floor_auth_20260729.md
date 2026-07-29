# SUMMARY_clock_kiosk_phase2_floor_auth_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase2_floor_auth_20260729`
- Status: `summarized`
- Owner agent: Codex
- Created at (UTC): `2026-07-29T16:09:17Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase2_floor_auth_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend contract: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md` §2 and §8

## What was implemented

- Added `"floor"` to the shared auth app-scope object/type, sign-in response schema, JWT `app_scope` claims union, and `AuthProvider` scope prop.
- Added one namespaced device-storage key, `beyo.floor.access_token`, owned and exported by `@beyo/api-client`.
- Extended `setAccessToken(token, scope?)` so it writes or removes that key only when the active scope is exactly `"floor"`; all non-floor calls retain the existing in-memory behavior.
- Extended `initSession("floor")` to restore the persisted token directly into memory without calling refresh. Non-floor boot still delegates to the existing refresh singleton.
- Added the floor branch in `refreshAccessToken`: clear memory/storage and return `false` before the refresh singleton or fetch path. The unchanged API client consequently dispatches the existing `auth:session-expired` event on a floor 401.
- Passed the validated sign-in scope directly to the token write boundary, so a successful floor sign-in persists the returned non-expiring device token.
- Relied on the existing logout flow's `setAccessToken(null)` call, which now clears floor storage and memory while retaining the existing query-cache/auth-store cleanup.
- Documented the accepted single-fullscreen-device limitation: floor storage is read only during boot, with no cross-tab synchronization.

## Conditional branches added and floor-gating proof

1. `setAccessToken`: `if (_authScope !== "floor") return` precedes every `localStorage.setItem` and `localStorage.removeItem` call. The non-floor regression test executes `admin`, `manager`, `worker`, and `seller` boot/write/clear flows with spies proving zero `getItem`, `setItem`, or `removeItem` calls.
2. `refreshAccessToken`: `if (_authScope === "floor")` clears through `setAccessToken(null)` and returns `false` before `_refreshPromise` and `_executeRefresh`. The MSW request log for a protected floor request returning 401 is exactly `GET /api/v1/protected`; refresh-call count is zero.
3. `initSession`: `if (scope === "floor")` is the only path that reads `localStorage`; it restores memory and returns token presence. The fallthrough remains `return refreshAccessToken(scope)` for every pre-existing scope.
4. `setAccessToken` optional-scope assignment: `if (scope) setAuthScope(scope)` makes the sign-in write boundary use the exact submitted scope. Persistence remains protected by branch 1.

## Files changed

- `packages/api-client/src/auth-token.ts`: floor storage, restore, revocation suppression, and JWT scope widening.
- `packages/api-client/src/index.ts`: public export for the floor storage-key constant.
- `packages/api-client/src/auth-token.test.ts`, `packages/api-client/vitest.config.ts`: persistence, non-floor isolation, and MSW 401-revocation coverage.
- `packages/auth/src/roles.ts`: additive `AppScope.Floor`.
- `packages/auth/src/api/use-sign-in.ts`: floor response parsing and scope-aware token write.
- `packages/auth/src/components/AuthProvider.tsx`: additive `AuthAppScope` prop typing for floor boot.
- `packages/auth/src/api/use-sign-in.test.tsx`, `packages/auth/vitest.config.ts`: floor sign-in body and persistence integration coverage.
- `package.json`: package-local `test:api-client` and `test:auth` scripts. The pre-existing Phase 1 `test:worker-shifts` and typecheck registration were preserved.
- Lifecycle artifacts: this summary, the Phase 2 archive record, the archived child plan, the master Review-log entry, and the intention-plan progress entry.

No `apps/*` source file changed. `packages/auth/src/store/auth.store.ts` required no edit because `AuthUser.appScope` already derives from the widened `AuthAppScope`.

## Validation evidence

- `npm run typecheck`: pass; exit code 0 and zero TypeScript errors across all four application workspaces and the registered shared-package chain.
- `npm run test:api-client`: pass; 1 file, 3 tests. Includes floor persist/restore, all four non-floor storage-spy checks, and floor 401 revocation.
- Zero-refresh assertion: pass; the floor 401 MSW request log contained only `GET /api/v1/protected`, with 0 requests whose path contained `/auth/refresh`.
- `npm run test:auth`: pass; 1 file, 1 test. The mutation sent `app_scope: "floor"`, persisted the returned token, and stored `user.appScope === "floor"`.
- Existing package suites: no pre-existing `@beyo/auth` or `@beyo/api-client` Vitest files/configurations existed before this phase; the new package-local suites are now the discoverable regression suites.
- Playwright: not run. This phase changes no app or UI code, and the child plan's required validation is root typecheck plus the two package Vitest suites.

## Deviations and corrections

- The first root typecheck exposed a shared `SignInForm` compatibility issue after narrowing mutation credentials from `string` to `AuthAppScope`. The mutation input type was restored to its pre-phase `string` contract; the response Zod schema, claims union, `AppScope`, and `AuthProvider` remain floor-aware. No app code changed.
- Direct `tsc` entries for `packages/api-client` and `packages/auth` were initially added to the root script, but their `src` globs include Vitest files and exposed unrelated duplicate-Vite declaration versions. Those extra entries were removed; all four application typechecks compile the shared production sources, while the two package Vitest commands compile and execute the test sources.
- No requirement was invented for malformed persisted JWT recovery or cross-tab synchronization. The child plan explicitly accepts boot-only storage reads for a single fullscreen kiosk.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_clock_kiosk_phase2_floor_auth_20260729_1609.md`
