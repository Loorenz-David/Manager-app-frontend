# Codex — Phase 8: `@beyo/presentations` phone player package

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–7 are implemented and archived — the creation side (studio + builder + runtime packages) is complete and hardened.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase8_player_package_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component kit (pre-built by Claude — READ-ONLY for you)

Per the master's "Division of labor" section, this phase's presentational components already exist in `packages/presentations/src/components/`, design-approved: player chrome (progress bar, slide dots, CTA button, dismiss affordances per presentation_type, deck container per surface form).

- **Never** restyle, restructure markup, or edit class lists. Your job: consumer api/hooks, view-state orchestration, the three playback modes, surface wrappers' logic, provider, assembly through the kit's prop contracts.
- Purely additive optional props allowed; anything structural/visual → plan Review log + stop for Claude. Never improvise styled components.
- If the kit is missing, STOP and report — the kit session runs before this one.

## GATE — do not start implementation until all are true

1. The plan carries a "Re-validate against master" note: re-read `@beyo/presentation-runtime`'s **shipped** public API (exports of `packages/presentation-runtime/src/index.ts`) and reconcile any drift from what the plan assumed. Record reconciliations in the plan's Review log before coding.
2. The plan's two clarifications are resolved in its "Clarifications required" section or the master Review log:
   - All three `playback_mode`s (`timed`/`manual`/`media_driven`) in player scope (recommended default: yes — the backend can serve all three).
   - **Dismiss-affordance chrome per `presentation_type`** — this needs an explicit user decision (no mockup exists). If unrecorded, STOP and ask.

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decision #10 (auto-show + realtime), package boundaries (player is app-agnostic; navigation/surface opening injected), master criterion 7 (view-state loop).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Backend ground truth: `docs/presentation_capability/backend/03_consumer_endpoints.md` (the exact view-state semantics, errors, typical loop) + `09_slide_composition.md` (playback modes) + `02_conventions.md` (`app_key` must equal token `app_scope`).

## Hard rules

- `GET /history` is **never wrapped** (master non-goal) — no scaffolding for it.
- View-state loop exactly per backend docs: `shown` with `last_slide_index: 0` on first display; `progressed` monotonic; `completed`/`dismissed` terminal handling; always send `version`; view-state failures never block playback UI; after a terminal action, refetch `/active`.
- `is_dismissible: false` → no dismiss path exists in any chrome; completion is the only exit.
- The orchestration provider is the single owner of "currently presenting"; it dedupes so an invalidation mid-show never double-opens. Export `activePresentationKeys` for Phase 9's realtime handler.
- Rendering goes through the shared runtime renderer — the parity fixture (same composition rendered in builder preview test and player test) is a required test.
- No app-specific imports anywhere; presigned URLs never persisted.
- Relational reads per the plan's whitelist. `data-testid` on all feature-critical elements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors (package registered).
- `npm run test:presentations` — view-state loop, all three playback modes, parity fixtures green.
- Playwright is deferred to Phase 9 (the player needs a host app) — state this in the summary rather than skipping silently.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase8_player_package_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log. Never archive/move the master.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state, reconciliations made at the gate, files created/modified, validation output, deviations with justification.
