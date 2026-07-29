# Codex — Phase 6: clock-out summary (analytics mapping + adapters)

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phase 4 is archived (Phase 5 is **shelved** out of v1 — master decision #10 — and does not exist in the sequence). A Claude session has committed the **summary kit** (SummaryScreen, SummaryHeader, WorkedTodayPlate, ItemsCompletedCarousel, WeekBarChart, RateTile, InsightRow, clock-in additions: scheduled plate column + AnnouncementsList) — **read-only** for you.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend ground truth: handoff §5.1 (`analytics`) of `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`
- GAP data spec: `docs/architecture/under_construction/implementation/clock_in_out_app/BACKEND_REQUIREMENTS_clock_kiosk_20260729.md` #1–#5 — these adapters MUST default to null/empty; the backend does not provide this data yet.

## Read before writing any code, in this order

1. The child plan, fully — kit contract, acceptance criteria 1–5.
2. The master plan — "Design → data mapping" table (the GAP rows) + decision #11.
3. Handoff §5.1, every caveat: `analytics: null` hard rule, `segments_truncated`, insight freshness ("indicative, not the payroll number"), additive unknown keys.
4. `task_system/frontend_contract_goal_mapping_guide.md` + the child plan's contracts (`24_dto.md` — the mapping module IS the view-model layer).
5. Permitted relational reads only: `packages/worker-shifts/src/types.ts` + the populated analytics fixture, kit prop types, and `packages/stats/src` solely to check whether an insight-code→copy map already exists (import it if so; record the finding).

## Hard rules

- `analytics: null` (and any unusable partial) → **exactly** the Phase 4 plain success screen. This is a handoff hard rule; regression-test it.
- IN/OUT/worked come from the `started_shift`/`ended_shift` segment markers (wall-clock span), not from summing buckets.
- Every GAP section (items, week, rate, scheduled column, announcements) renders only when its adapter yields data; with the v1 defaults (null/empty) the summary is hero + insights (+ stopped-tasks notice) and stays visually balanced — the kit guarantees the layout, you guarantee the gating.
- The mapping module is pure and lives in one place; components receive finished view models. No date/duration math inside components.
- Dev showcase adapters (design-image data) exist behind a dev-only flag with `VITE_FLOOR_MOCKS=1`; production defaults stay empty.
- Kit read-only; additive optional props only, recorded in the Review log.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:clock-kiosk` — mapping module (markers, formats, insight codes, null/partial degradation) + adapter gating green.
- `npx playwright test --grep kiosk-summary --project=mobile` then `--project=desktop` — full-analytics render (right section order per breakpoint) and `analytics: null` plain-screen — mocked, green.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729.md` → archive record → plan archived + moved → dated master Review log entry. On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, the adapter interfaces as shipped, files created/modified, validation output, deviations with justification.
