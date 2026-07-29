# Opus review — Phase 1: `@beyo/worker-shifts` domain package

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session implemented an approved plan. Verify the implementation against the plan and shared rules, then bless it or produce a corrections plan. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase1_worker_shifts_package_20260729.md` — if absent, it was archived after validation: look in `docs/architecture/archives/implementation/`.
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_worker_shifts_package_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`.
- Backend ground truth: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`.

## Read in order

1. Master — "Decisions", "Package boundaries", "Backend route ownership", "Acceptance criteria (master-level)", Review log.
2. The phase plan — its acceptance criteria and "File read intent" whitelist.
3. The implementation summary. 4. `task_system/frontend_contract_goal_mapping_guide.md`. 5. The implementation itself. 6. The backend handoff, fully.

## Phase-specific checklist (beyond the plan's criteria)

1. **Schema fidelity** — diff every zod schema against the handoff JSON field-by-field: names, nullability, enums (`idle|working|in_pause`; `started_shift|working|paused|idle|ended_shift`), the `reason_text` legacy edge, analytics passthrough of unknown keys. Any invented or renamed field is a defect.
2. **No UI leakage** — zero JSX/React-DOM imports; package imports only `@beyo/api-client`/`@beyo/lib` (+ react/query as peers for hooks).
3. **No pause-reason duplication** — grep for redefined catalog shapes.
4. **Legacy `/clock` route** — must not exist anywhere.
5. **No optimistic updates** — action hooks must not `setQueryData` shift state.
6. **Mock completeness** — every 409/404 branch and both analytics variants exist and match the schemas (fixtures parsed through the schemas in tests, not hand-asserted).
7. **Matcher purity** — `match-worker`/`shift-time` are pure, injectable-`now`, no module state; edge cases from the plan covered.
8. **Validation evidence** — re-run `npm run typecheck` and `npm run test:worker-shifts` yourself. Never trust the summary's claims.
9. **Lifecycle bookkeeping** — summary exists, plan archived + moved, master Review log entry appended, master itself otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity, each with file:line and the criterion/rule violated.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase1_corrections_<YYYYMMDD>.md` from `docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md`, scoped to fixes only, status `under_construction`, linked to the phase plan + master, each finding routed (Codex logic / Claude visual — Phase 1 has no visuals, so expect Codex).
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code or the archived phase plan.
