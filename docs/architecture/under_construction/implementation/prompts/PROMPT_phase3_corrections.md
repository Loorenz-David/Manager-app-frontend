# Codex — Phase 3 corrections: implement the dashboard (logic + assembly + tests)

You are implementing a **corrections plan** for Phase 3 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Context: the original Phase 3 implementation session stopped without producing code; a review confirmed nothing was implemented and wrote a sharper corrections plan. That corrections plan is your spec — it supersedes the original phase plan where they differ. Note: the backend has since added per-deck card-preview fields to the admin list (`slide_count`, `media_kinds`, `cover_url` — see the re-synced `docs/presentation_capability/backend/04_admin_presentations.md`); cards derive entirely from list items, `PresentationListItemSchema` must be extended with those three fields (plan item F2b), and **no `GET /{id}` call exists on the dashboard**.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_corrections_20260722.md` (status `approved`) — follow its acceptance criteria 1–10 exactly.
- Original phase plan (context + unchanged intent): `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_studio_dashboard_20260722.md`.
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`.

## Component kit (pre-built by Claude — READ-ONLY for you)

The approved dashboard kit is in `packages/presentation-builder/src/components/dashboard/` and already reviewed defect-free. **Never** restyle, restructure markup, or edit class lists there. `git diff` on that directory must be empty when you finish (the corrections plan's validation requires it). If a prop contract doesn't fit: purely additive optional props are NOT allowed in this corrections session — the plan says stop and route to Claude-builder instead.

## Read before writing any code, in this order

1. The corrections plan, fully — its Contracts loaded section and File read intent are your reading discipline.
2. The master plan — decisions #11 (status mapping), package boundaries (navigation injected; package never imports the router).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Backend list/detail/create contracts: `docs/presentation_capability/backend/04_admin_presentations.md`.
5. Design ground truth: `docs/presentation_capability/design/README.md` §1a + `presentation_menu.png`.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:presentation-builder` — existing + new Phase 3 suites green.
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-dashboard --project=desktop` — full flow green, no console/page errors.
- `git diff -- packages/presentation-builder/src/components/dashboard/` — empty.

## After implementation — process per the corrections plan (criterion 10)

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`, with this plan's specific lifecycle:

1. Only once validation is fully green: write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase3_studio_dashboard_20260722.md` (covering the phase as now implemented, noting it happened via this corrections plan).
2. Archive the **original** Phase 3 plan (`Status: archived`, `mv` to `docs/architecture/archives/implementation/`, verify).
3. Append a dated implementation entry to the master plan's Review log. Never archive or move the master.
4. **Leave the corrections plan in place with `Status: approved`** — it is archived only after its own independent re-review (the operator will run the Phase 3 review prompt again).
5. If validation cannot go green: set the corrections plan to `Status: debugging`, record the defect in its Review log, stop with a report.

## Report back

End with: lifecycle state, files created/modified, all four validation outputs, and any deviation from the corrections plan with its justification.
