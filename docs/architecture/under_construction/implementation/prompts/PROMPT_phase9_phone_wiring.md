# Codex — Phase 9: Mount the player in the three phone apps + realtime

You are implementing the **final phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–8 are implemented and archived; `@beyo/presentations` exists and is unit-tested but not yet mounted anywhere.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase9_phone_apps_wiring_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component ownership (per master "Division of labor")

All player UI comes from `@beyo/presentations` (Claude-owned components, Codex-wired logic — both already shipped in Phase 8). This phase creates **no styled UI**: wiring, registration, provider mounting, and route/CTA mapping only. If any app needs a visual affordance that doesn't exist (e.g. an entry point button), record it in the plan Review log and stop for Claude — never improvise styled components in the apps.

## GATE — do not start implementation until recorded

**V3 is resolved (backend team, 2026-07-22): no gate remains for it.** Socket.io events `app_update_presentation:published` and `app_update_presentation:archived`, room `workspace:{workspace_id}` (auto-joined on connect), payload with no outer envelope: `{ "client_id": "aup_...", "logical_client_id": "aup_...", "version": 2 }`. Change signal only — refetch `/active` on receipt; subscribe to **both** events (an archived presentation may be the currently active one). No created/updated events exist. See backend `04_admin_presentations.md` → "Realtime (socket) events".

One gate remains:

1. **Auto-show timing policy**: whether the presentation may auto-open anywhere or only on each app's home/root route (plan recommendation: home/root only; workers possibly more conservative). Needs the user's decision.

If it is missing, STOP and ask.

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decision #10, master criteria 1 and 7, the double-show risk + mitigation.
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second) — `21_realtime.md` and `14_styling.md` §14 are central here.
5. Backend: `docs/presentation_capability/backend/03_consumer_endpoints.md` + `06_admin_audience.md` (eligibility is 100% backend-side — the frontend performs zero eligibility logic).
6. Relational reads (whitelist): each app's shell (`AppShell.tsx` / root providers), `@beyo/realtime` public API, one existing realtime consumer's subscribe call.

## Hard rules

- Wire **managers-app first**, validate it end-to-end against a real studio-published announcement, record any shell divergences in the plan Review log, then replicate to sellers-app and workers-app honoring each app's own shell conventions.
- Per app: `@source` entries for `@beyo/presentations` + `@beyo/presentation-runtime`; surface registration via loader functions; provider at the authenticated-shell level; `app_key` = `"manager"` / `"seller"` / `"worker"` respectively; CTA `action.route` mapped through each app's router.
- The realtime handler subscribes to **both** `:published` and `:archived` and **only invalidates** `activePresentationKeys` — it never opens surfaces directly (double-show guard lives in the provider).
- Player chunks stay lazy — no player code in any app's boot chunk.
- Playwright mobile project first, then desktop; if a player control sits inside `PullToRefresh`, use the established `press()`/tap helper (mobile `filterTaps` swallows synthetic clicks).

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors, all workspaces.
- `npm run test:presentations` + affected app suites — green.
- `npx playwright test --grep presentation-player --project=mobile` then `--project=desktop` — green in all three apps.
- Manual cross-system matrix: publish targeted at one `app_key` → appears in that app only (realtime while connected, cold boot otherwise); completed presentations never reappear; next eligible surfaces after terminal action.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. **Master close-out:** append a dated Review log entry marking all 9 phases complete, set the master's `Status` to `archived`, update its `Last updated at`, and move it to `archives/implementation/` as well — this is the only phase allowed to archive the master.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state (including master close-out), per-app wiring notes/divergences, validation output incl. the cross-app matrix, deviations with justification.
