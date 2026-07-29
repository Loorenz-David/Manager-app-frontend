# PLAN_clock_kiosk_phase2_floor_auth_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase2_floor_auth_20260729`
- Status: `archived`
- Owner agent: Codex (implementer) / Claude Fable (author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T16:09:17Z`
- Master plan: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Backend contract: handoff §2 (Auth — floor scope) + §8 (401 semantics)

## Goal and intent

- Goal: teach the shared auth layer the **`floor` app scope**: a non-expiring access token persisted in device storage, no refresh cookie, no refresh call, permanent revocation via logout, `401` ⇒ device revoked ⇒ sign-in screen.
- Intent: the floor app (Phase 3) signs in once with an admin/manager account and stays authenticated across reloads/reboots until explicitly logged out.
- Non-goals: no floor app yet; no UI; no behavior change of any kind for `manager`/`worker`/`seller` scopes.

## Scope

- In scope: `packages/api-client/src/auth-token.ts` (+ its env/types as needed), `packages/auth/src/{roles.ts, api/use-sign-in.ts, components/AuthProvider.tsx, store or lib as strictly needed}`.
- Out of scope: `apps/*`; every other package; sign-in UI (the existing `SignInForm` already takes `appScope` as a prop).
- Assumptions: current behavior (relational reads) — token in a module variable only; reload restores via `initSession(scope)` → `POST /auth/refresh?scope=` with httpOnly cookie; `401` triggers single-flight refresh + replay; `auth:session-expired` event routes to sign-in.

## Clarifications required

- (none — master decision #3 fixes the storage and revocation semantics)

## Acceptance criteria

1. `"floor"` added to every scope/claim union: `TokenClaims.app_scope` (api-client), `AppScope` + sign-in schema (`@beyo/auth`), and anywhere else the unions are narrowed. Root typecheck surfaces all sites; none left stale.
2. Persistence, strictly scope-conditional: when the active auth scope is `floor`, `setAccessToken` writes the token to `localStorage` (single namespaced key, e.g. `beyo.floor.access_token`) and clears it on sign-out/revocation. **No other scope ever touches storage** — the write/read/clear paths are unreachable unless `app_scope === "floor"`.
3. Refresh suppression under floor scope: the 401-retry path never calls `refreshAccessToken`; instead it clears the persisted token and dispatches the existing `auth:session-expired` event (handoff: revoked within ≤60s server-side). The single-flight refresh machinery for other scopes is untouched.
4. Boot path: `initSession("floor")` restores the persisted token (if any) into memory, then hydrates via `GET /api/v1/users/me` exactly like other scopes; a `401` during hydration clears storage and lands on signed-out. No refresh request appears on the network under floor scope, ever.
5. Sign-in: `use-sign-in` with `appScope="floor"` sends `{email|username, password, app_scope: "floor"}` and, on success, persists per criterion 2. Sign-out calls `POST /api/v1/auth/logout` (existing endpoint wiring) and clears storage + memory + query cache per the existing flow.
6. Regression proof: the existing `@beyo/auth` + `@beyo/api-client` test suites pass unmodified (except where they enumerate scope unions); new tests cover: floor persist/restore round-trip, 401-revocation path (no refresh request issued — assert via MSW request log), non-floor scopes never reading/writing storage.
7. Root `npm run typecheck` green; no app code changed.

## Contracts and skills

### Contracts loaded

- Core set (guide) + `12_auth.md` (+`12_auth_local.md` — sign-in body/app_scope, refresh envelope, logout endpoint; local wins), `04_api_client.md` (+`_local` — refresh response envelope, `decodeTokenClaims`), `26_persistence.md` (storage conventions), `17_testing.md`.

### File read intent — pattern vs. relational

Permitted relational reads: `packages/api-client/src/{auth-token.ts, env.ts}`, `packages/auth/src/{roles.ts, api/use-sign-in.ts, components/AuthProvider.tsx, store/auth.store.ts}`, their existing tests (what current behavior is contractually locked).
Prohibited: reading app auth wiring beyond confirming no app change is needed.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Extend scope unions (criterion 1); let typecheck enumerate the narrow sites.
2. Add the floor-conditional persistence module inside `api-client` (write/read/clear; storage key constant exported for tests).
3. Gate the 401 path: floor → clear + `auth:session-expired`; others → unchanged refresh.
4. Extend `initSession` boot for floor restore (criterion 4).
5. Sign-in/sign-out persistence wiring (criterion 5).
6. Tests (criterion 6); root typecheck.

## Risks and mitigations

- Risk: regressing the three live apps' token flow. Mitigation: criteria 2/3/6 make non-floor paths provably untouched; reviewer re-runs their suites and diff-audits every non-floor branch.
- Risk: two floor tabs/windows desync memory vs storage. Mitigation: storage is read only at boot; the kiosk is a single fullscreen app — documented limitation in code comment at the storage module.

## Validation plan

- `npm run typecheck`: zero errors.
- `@beyo/auth` + `@beyo/api-client` vitest suites: green, including new floor cases.

## Review log

- 2026-07-29 Codex: Phase 2 implemented and validated. `npm run typecheck` passed with zero errors; `npm run test:api-client` passed 1 file / 3 tests; `npm run test:auth` passed 1 file / 1 test. The floor 401 MSW request log contained only the protected GET and asserted zero refresh calls. Summary and archive record created; child plan status set to `archived` for the lifecycle move.

## Lifecycle transition

- Current state: `archived`
- Transition owner: Codex session (completed 2026-07-29)
