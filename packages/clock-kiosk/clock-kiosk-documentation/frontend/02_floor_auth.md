# 02 — Floor-scope device auth (`@beyo/api-client` + `@beyo/auth` slices)

Last verified: 2026-07-30 · commit `e8a35e19`

⚠ **HIGHEST BLAST RADIUS ZONE.** These files are shared by managers, workers,
and sellers apps in production. Every floor behavior is gated on
`app_scope === "floor"`; the standing rule from the Phase 2 review is:
**any diff reachable under `manager`/`worker`/`seller` scope is a defect**
unless it is a pure type widening or an additive optional prop.

## What floor scope changes (and where)

| Behavior | Location | Gate |
|---|---|---|
| Token persisted to `localStorage` key `beyo.floor.access_token` (write/read/clear) | `packages/api-client/src/auth-token.ts` | `_authScope !== 'floor' → return` precedes every storage call |
| **Zero refresh calls ever**: 401 = permanent revocation → clear storage+memory → existing `auth:session-expired` event | `auth-token.ts` (gate inside `refreshAccessToken`, so BOTH callers — api-client retry and RealtimeProvider — are covered) | floor branch before single-flight |
| Boot: restore persisted token → hydrate via `GET /users/me`; corrupt/401 → cleared, signed-out | `initSession('floor')` in `auth-token.ts` + `packages/auth/src/components/AuthProvider.tsx` | scope param |
| Sign-out: `POST /auth/logout` wrapped in a **floor-gated `finally`** — local revocation (storage+memory+store+query cache) happens on success OR failure (shared terminal must never re-restore a "logged-out" token) | `packages/auth/src/api/use-sign-out.ts` | floor-gated |
| `onSessionExpired?: () => void` optional callback on `AuthProvider` — fired inside the existing expiry listener; live apps don't pass it (inert `?.()`) | `AuthProvider.tsx` | additive optional |
| Type widenings: `"floor"` in `AppScope`, `TokenClaims.app_scope` | `packages/auth/src/roles.ts`, `api-client` claims | additive |

The floor app consumes this via `AuthProvider appScope="floor"` and passes
`onSessionExpired` to set its session-scoped revoked-device flag
(`floor-app/src/lib/floor-session-expired.ts` → the "terminal signed out"
note on `SignInPage`).

## Trust model (from the handoff — explains why this is safe)

The 4-digit code **identifies, never authenticates**. The trust anchors are
(1) the manager-authorized device token and (2) the human "is this you?"
confirmation tap. Every action endpoint re-validates server-side. That's why
a localStorage token on a shared device is the accepted design.

## Rules for changing this zone

1. Run `test:auth` + `test:api-client` + `test:ui` before AND after — the
   non-floor invariance tests (four scopes × storage spies, zero-refresh MSW
   log assertions) are the safety net; extend them for any new branch.
2. New floor behavior goes behind the same scope gate pattern; prefer a new
   floor-gated branch over widening an existing shared one.
3. Never introduce a second sign-out path or session-expired event — extend
   the existing ones.
4. Changing shared sign-out/boot semantics for ALL scopes is a user decision
   (a rejected proposal to that effect is recorded in the master Review log).

## Verification pointers

- `packages/api-client/src/auth-token.ts` (the storage + 401 + boot gates)
- `packages/api-client/src/auth-token.test.ts` (zero-refresh + storage-spy proofs)
- `packages/auth/src/api/use-sign-out.ts` (+ its test: logout-failure → key cleared)
- Handoff §2 (floor auth contract), §8 (401 semantics)
