# Codex — Phase 1: `@beyo/worker-shifts` domain package (no UI)

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. This is the first phase; nothing else of the capability exists yet.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase1_worker_shifts_package_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend ground truth (the ONLY source of shapes): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — "Decisions", "Package boundaries", "Backend route ownership by phase".
3. The backend handoff, fully — it is a build-ahead contract; you are wrapping shapes whose endpoints are mostly not live.
4. `task_system/frontend_contract_goal_mapping_guide.md`.
5. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second; local wins).
6. Permitted relational reads only (child plan "File read intent"): `packages/stats/{package.json, tsconfig.json, vitest.config.ts, src/api/worker-stats-keys.ts}`, `packages/pause-reasons/src/{index.ts, types.ts}`, root `package.json`.

## Hard rules

- **Logic only.** No JSX, no components, no surfaces in this package — ever.
- Every schema field name is byte-identical to the handoff. Invent nothing. The legacy `POST /worker-shifts/clock` toggle is never wrapped.
- Pause-reason shapes belong to `@beyo/pause-reasons` — import nothing from it and redefine nothing here. (The declared-states action hooks you wrap have **no v1 UI** — they serve future declare pages, master decision #10. Wrap them exactly per the handoff anyway.)
- No optimistic updates in the action hooks — the kiosk contract renders from fresh server state only.
- Package ships raw TS (`exports { ".": "./src/index.ts" }`), `peerDependencies` only, no build step.
- MSW mocks must implement the 409/404 branches and the `analytics: null` vs populated variants — they are the app's runtime until backend phases flip.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors (package registered in the root chain).
- `npm run test:worker-shifts` — all suites green, including handoff-JSON round-trips and every mocked error branch.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Only once validation is green: write `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_worker_shifts_package_20260729.md`.
2. Create the archive record in `docs/architecture/archives/`.
3. Set plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify the move.
4. Append a dated entry to the master plan's Review log. Never archive or move the master.
5. If validation fails: leave the plan in place, set `Status: debugging`, record it in the plan Review log, stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output, deviations with justification.
