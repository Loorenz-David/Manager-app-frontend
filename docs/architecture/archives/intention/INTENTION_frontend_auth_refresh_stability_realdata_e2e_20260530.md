# INTENTION_frontend_auth_refresh_stability_realdata_e2e_20260530

## Metadata

- Intention ID: `INTENTION_frontend_auth_refresh_stability_realdata_e2e_20260530`
- Status: `active`
- Owner: `github-copilot`
- Created at (UTC): `2026-05-30T09:28:24Z`
- Last updated at (UTC): `2026-05-30T09:28:24Z`

## Goal

Stabilize frontend auth session behavior and Playwright real-data test strategy so real-auth E2E runs are deterministic and do not fail from eager refresh churn or mixed mock/real flow design.

## Why this matters

Auth instability in startup/refresh paths produces false E2E failures, slows delivery, and hides real feature regressions behind session-expired noise.

## Success criteria

1. App boot no longer performs unnecessary immediate refresh when a fresh access token from sign-in already exists in memory.
2. Session-expired behavior remains intact for true invalid sessions but does not cascade from avoidable eager refresh calls.
3. Real-data E2E specs use a consistent strategy: real `auth.signIn()`, no heavy API route mocks in the same spec, and deterministic worker model.
4. Cases mobile real-data regression runs execute without auth churn artifacts attributable to frontend flow design.

## Scope boundary

- In scope:
  - Frontend auth bootstrap behavior in app startup provider.
  - Frontend refresh failure handling semantics for E2E stability.
  - Playwright spec strategy split between mock-data and real-data tests.
  - Test run profile guidance (`--workers=1`) for real-auth runs until backend multi-session policy is confirmed.
- Out of scope:
  - Backend cookie issuance policy and session invalidation model implementation.
  - Domain feature changes unrelated to auth/session bootstrap.
- Non-goals:
  - Replacing current session-expired redirect pattern.
  - Rewriting the full auth stack.

## Linked implementation plans

| Plan ID | Path | Status | Covers |
|---------|------|--------|--------|
| `PLAN_TBD_frontend_auth_boot_refresh_guard_20260530` | `docs/architecture/under_construction/implementation/PLAN_TBD_frontend_auth_boot_refresh_guard_20260530.md` | `planned` | Guard startup refresh path to avoid eager refresh when valid token already exists |
| `PLAN_TBD_realdata_e2e_auth_strategy_split_20260530` | `docs/architecture/under_construction/implementation/PLAN_TBD_realdata_e2e_auth_strategy_split_20260530.md` | `planned` | Separate real-data auth specs from mock-heavy specs and document worker policy |

## Progress notes

- `2026-05-30`: Identified sign-in success + immediate refresh 403 sequence in local E2E runs; confirmed this creates session-expired cascades and route-level test instability.
- `2026-05-30`: Confirmed cases test suite had mixed assumptions (real auth and mocked API behavior) and requires strategy split for deterministic execution.

## Open questions

- Should frontend suppress first refresh attempt for a short grace period right after successful sign-in? — impact if unresolved: repeated startup refresh may continue to amplify backend/session race conditions.
- Should real-data E2E runs be enforced as single-worker by default in npm scripts? — impact if unresolved: flaky auth state across parallel contexts may persist.
- Do we need a frontend-visible retry/backoff distinction for refresh 403 in E2E/dev mode? — impact if unresolved: immediate hard-fail behavior may keep masking unrelated UI assertions.

## Lifecycle transition

- Current status: `active`
- Next status: `achieved`
- Transition trigger: frontend boot-refresh hardening implemented, real-data E2E strategy documented/applied, and auth-related false failures no longer observed in target suite.
