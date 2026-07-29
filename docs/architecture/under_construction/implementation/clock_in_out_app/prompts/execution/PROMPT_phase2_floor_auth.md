# Codex — Phase 2: floor-scope device auth (persisted non-expiring token)

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phase 1 (`@beyo/worker-shifts`) may or may not be archived yet — this phase is independent of it and touches only the auth layer.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase2_floor_auth_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend ground truth: handoff §2 + §8 of `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decision #3 (auth persistence) and the Phase-2 risk rows.
3. Handoff §2 (floor scope: non-expiring JWT, no refresh cookie, logout = permanent revocation, 401 = revoked) and §8.
4. `task_system/frontend_contract_goal_mapping_guide.md`.
5. Contracts from the child plan — `12_auth.md` + `12_auth_local.md` and `04_api_client.md` + `04_api_client_local.md` are the critical pair (local wins).
6. Permitted relational reads only: `packages/api-client/src/{auth-token.ts, env.ts}`, `packages/auth/src/{roles.ts, api/use-sign-in.ts, components/AuthProvider.tsx, store/auth.store.ts}` and their existing tests.

## Hard rules

- **The three live apps must be byte-identical in behavior.** Every persisted-token code path must be unreachable unless the active scope is `"floor"`. Treat any diff that executes under `manager`/`worker`/`seller` scope as a defect unless it is a pure type-union widening.
- Under floor scope, **no refresh request may ever be issued** — 401 means revoked: clear storage + memory, dispatch the existing `auth:session-expired` event. Do not create a new event or a parallel sign-out path.
- Token goes to `localStorage` under one namespaced key; never into URLs or logs.
- No app code changes in this phase. No UI.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors, all workspaces.
- Existing `@beyo/auth` + `@beyo/api-client` vitest suites — green (modified only where they enumerate scope unions).
- New tests — floor persist/restore round-trip; 401-revocation with an MSW request log asserting **zero** refresh calls; non-floor scopes never touching storage.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase2_floor_auth_20260729.md` → archive record → plan archived + moved → dated entry in the master Review log (include the zero-refresh assertion result). On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, the exact list of conditional branches added and proof they are floor-gated, files created/modified, validation output, deviations with justification.
