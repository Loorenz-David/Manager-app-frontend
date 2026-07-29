# Opus review — Phase 2: floor-scope device auth

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session implemented an approved plan touching the shared auth layer. This is the highest-blast-radius phase of the capability: three live apps depend on the files changed. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase2_floor_auth_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase2_floor_auth_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` (decision #3, Phase-2 risk rows).
- Backend ground truth: handoff §2 + §8 of `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`.
- Contract pair that binds this code: `architecture/12_auth.md` + `12_auth_local.md`, `architecture/04_api_client.md` + `04_api_client_local.md`.

## Read in order

Master (decision #3 + risks) → phase plan → summary → contract guide → **the full diff of `packages/api-client` and `packages/auth`** → handoff §2/§8.

## Phase-specific checklist (beyond the plan's criteria)

1. **Non-floor invariance (the critical check)** — walk every changed branch and prove it is unreachable under `manager`/`worker`/`seller` scopes, or is a pure type widening. Any behavioral diff reachable by the live apps is a severity-1 defect.
2. **Zero refresh under floor** — trace the 401 path under floor scope end-to-end: no `refreshAccessToken` call, storage + memory cleared, the **existing** `auth:session-expired` event dispatched (no new event, no parallel sign-out path).
3. **Storage discipline** — one namespaced localStorage key; written only under floor scope; read only at boot; cleared on sign-out/revocation; token never interpolated into URLs or log statements.
4. **Boot path** — floor `initSession` restores then hydrates via `/users/me`; 401 during hydration clears and lands signed-out; other scopes still refresh-boot exactly as before.
5. **Test honesty** — the zero-refresh assertion actually inspects the MSW request log (not just "no error thrown"); the never-touches-storage test covers all three non-floor scopes.
6. **Validation evidence** — re-run root `npm run typecheck` and both packages' vitest suites yourself.
7. **Lifecycle bookkeeping** — summary, archive move, master Review log entry (must include the zero-refresh result), master otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity with file:line + violated rule; explicitly state your conclusion on checklist #1 even when passing.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase2_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, findings routed (all Codex — no visuals in this phase).
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code or the archived phase plan.
