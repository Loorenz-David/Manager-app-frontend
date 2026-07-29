# PLAN_clock_kiosk_phase1_worker_shifts_package_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase1_worker_shifts_package_20260729`
- Status: `archived`
- Owner agent: Codex (implementer) / Claude Fable (author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T15:21:50Z`
- Master plan: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Backend contract (sole source of shapes): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Goal and intent

- Goal: create `@beyo/worker-shifts` (`packages/worker-shifts`) — the complete logic layer for the worker-shift domain: zod types, query keys, API functions, query hooks, action hooks, pure roster-matching and shift-time helpers, and MSW build-ahead mocks. Zero UI, zero JSX.
- Intent: every later phase (and, later, the workers/managers apps) consumes shifts exclusively through this package. Note: the declared-states action hooks are wrapped here because the domain package serves the **future declare pages** — no v1 kiosk UI consumes them (master decision #10, user 2026-07-29).
- Non-goals: no components, no surfaces, no kiosk flow, no pause-reason types (owned by `@beyo/pause-reasons`), no wrapping of the legacy `/clock` toggle, no auth changes (Phase 2).

## Scope

- In scope: `packages/worker-shifts/` per the master's package-boundaries block; root `package.json` registration (`test:worker-shifts`, typecheck chain entry).
- Out of scope: everything rendered; `apps/*` untouched; `@beyo/api-client`/`@beyo/auth` untouched.
- Assumptions: the handoff is ground truth; every endpoint except pause-reasons is ❌ (mocks are the runtime until backend phases flip).

## Clarifications required

- (none — master decisions #4, #5, #11 resolve identification, matching, and mocking strategy)

## Acceptance criteria

1. `types.ts` covers every shape in handoff §3–§6 with zod schemas + inferred types: `FloorRosterUser`, `CurrentShift`, `ShiftState`, `ClockInResult`, `ClockOutResult`, `ClockOutAnalytics` (+ `AnalyticsTimeline`, `AnalyticsSegment`, `AnalyticsInsight`, `SegmentState`), `DeclaredState`, `DeclareStateResult`, `CloseDeclaredStateResult`. Field names byte-identical to the handoff. `analytics` is nullable everywhere it appears; unknown extra keys inside it do not fail parsing (`.passthrough()`/`.loose()` per repo zod convention). Legacy `reason_text` edge (handoff §4) representable.
2. `api/worker-shift-keys.ts` key factory follows the repo convention (`all` → scoped lists → params-last).
3. API functions (one file per call, apiClient + schema): `fetch-floor-roster.ts` (`GET /api/v1/users?role=worker&compact=true&limit=200`), `fetch-current-shift.ts` (`GET /api/v1/worker-shifts/current?user_id=`). Roster fetch logs a single `console.warn` when exactly 200 rows return (master risk).
4. Query hooks: `use-floor-roster-query.ts` (`refetchInterval` 2 min, `refetchOnWindowFocus: true`, `staleTime` aligned), `use-current-shift-query.ts` (accepts `user_id`; default `enabled: false` unless an id is passed — the kiosk always fetches fresh per confirm, so the hook exposes a `fetchFresh` pattern via `queryClient.fetchQuery` helper or an exported imperative function; pick one and document it in `index.ts`).
5. Action hooks (`actions/`): `use-clock-in.ts`, `use-clock-out.ts`, `use-declare-state.ts`, `use-close-declared-state.ts` — each `useMutation` wrapping the exact route/body from handoff §5–§6, invalidating the current-shift key for the target `user_id` on settle. No optimistic updates (kiosk renders from fresh server state by contract — handoff §3/§6 rules).
6. Pure lib, fully unit-tested: `lib/match-worker.ts` (trim input; code exact match; email case-insensitive; returns the matched `FloorRosterUser` or `null`; never throws; one result even if data is dirty) and `lib/shift-time.ts` (elapsed-since helpers, HH:mm localization in a given IANA time zone, first-name extraction, day-part greeting bucket — pure, injectable `now`). Greeting cutoffs (resolved 2026-07-29, operator-approved): in the workspace time zone, **morning 05:00–11:59, afternoon 12:00–17:59, evening 18:00–04:59** — constants exported from the module so the future UI copy maps 1:1.
7. `mocks/` exports MSW handlers + fixtures implementing handoff §2–§8 shapes for every ❌ endpoint, including: 409 already-clocked-in / not-clocked-in / no-open-declaration, 404 unknown target, `transitioned_steps` variants, `analytics: null` and a fully-populated `analytics` fixture (timeline+segments+insights per §5.1), declared-state switch semantics. Handlers are stateful enough to flip a mock worker between clocked in/out across calls so flows are testable.
8. Package scaffolding matches the newest convention (`@beyo/stats` as relational reference): raw-TS `exports { ".": "./src/index.ts" }`, peerDependencies only, flat tsconfig, per-package `vitest.config.ts` with root-relative include + `VITE_API_URL` define; `test:worker-shifts` script registered at root; package added to root typecheck chain.
9. Vitest suites green: types round-trip the handoff's own JSON examples verbatim; matcher edge cases (whitespace, case, null codes, duplicate emails); time helpers across time zones; action hooks against the MSW handlers (success + each 409/404 branch).
10. `npm run typecheck` green at root. `index.ts` exports exactly the public API (types, keys, fns, hooks, matcher, time helpers, mocks entry) — nothing else.

## Contracts and skills

### Contracts loaded

- Core set (guide): `01_architecture.md` (+`_local`), `02_types.md`, `04_api_client.md` (+`_local`), `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`
- `16_feature_workflow.md`: build order (types → keys → api+queries → actions)
- `24_dto.md`: schema + view-model discipline
- `17_testing.md`: vitest + MSW conventions
- `03_environment.md`: env access rules (mock flag definition only if needed here)
- `35_shared_packages.md`: package scaffolding, no-build rule, peer-deps

### File read intent — pattern vs. relational

Permitted relational reads: the backend handoff (ground truth); `packages/stats/{package.json, tsconfig.json, vitest.config.ts, src/api/worker-stats-keys.ts}` (scaffolding + key-factory confirmation); `packages/pause-reasons/src/{index.ts, types.ts}` (verify catalog ownership so nothing is duplicated); root `package.json` (script registration shape).
Prohibited: reading other packages' hooks/actions/controllers to learn structure — `05`/`08`/`24` define it.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`. No other repo skill applies.

## Implementation plan

1. Scaffold `packages/worker-shifts/` (package.json, tsconfig, vitest config, src/index.ts) + root registration.
2. `types.ts` from handoff §3–§6 (schemas first, JSON examples as test fixtures).
3. `api/worker-shift-keys.ts`.
4. API functions + query hooks (criteria 3–4).
5. Action hooks (criterion 5).
6. `lib/match-worker.ts` + `lib/shift-time.ts` with tests.
7. `mocks/` handlers + fixtures (criterion 7).
8. Test suites; root typecheck; public-API audit of `index.ts`.

## Risks and mitigations

- Risk: inventing fields the handoff doesn't define. Mitigation: criterion 1 byte-identity; the review prompt diffs schemas against the handoff JSON.
- Risk: mocks drift from types. Mitigation: fixtures are parsed through the very schemas at test time.

## Validation plan

- `npm run typecheck` — zero errors, all workspaces.
- `npm run test:worker-shifts` — all suites green.

## Review log

- 2026-07-29 Codex: paused pre-implementation — greeting day-part cutoffs unspecified.
- 2026-07-29 Claude (Fable), operator-relayed: approved Codex's proposed defaults (morning 05:00–11:59, afternoon 12:00–17:59, evening 18:00–04:59, workspace time zone); criterion 6 amended to carry them.
- 2026-07-29 Codex: Phase 1 implemented and validated. `npm run typecheck` passed with zero errors; `npm run test:worker-shifts` passed 5 files / 32 tests. Summary and archive record created; child plan status set to `archived` for the lifecycle move.

## Lifecycle transition

- Current state: `archived`
- Transition owner: Codex session (completed 2026-07-29)
