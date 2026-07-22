# Codex — Phase 3: Announcements dashboard

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–2 are implemented and archived: `@beyo/presentation-builder` has the full admin logic layer; `apps/presentation-studio` is a running shell with empty routed pages.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_studio_dashboard_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component kit (pre-built by Claude — READ-ONLY for you)

Per the master's "Division of labor" section, this phase's presentational components already exist in `packages/presentation-builder/src/components/`, built props-first against mock data and design-approved by the user: dashboard top bar, filter row, announcement card, new-announcement card, mini-phone cover, status pills, skeleton/empty/error states.

- **Never** restyle, restructure markup, or edit class lists in kit components. Your job is logic + assembly: build the controller/helpers and feed state through the kit's typed prop contracts (data in, callbacks out).
- A purely **additive optional prop** may be added if a contract doesn't fit — without touching DOM/classes. Anything structural/visual: record the needed change in the plan's Review log and stop for Claude; do not improvise your own styled components.
- If the kit is missing (directory absent), STOP and report — the kit session runs before this one.

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decisions #11 (status mapping), package boundaries (navigation is injected, the package never imports the router).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Design ground truth for this screen: `docs/presentation_capability/design/README.md` §1a + `docs/presentation_capability/design/presentation_menu.png` — match layout, tokens, and card anatomy closely (high-fidelity handoff).
6. Backend list contract: `docs/presentation_capability/backend/04_admin_presentations.md` (GET list/search params + compact item shape).

## Hard rules

- Dashboard UI/logic lives in `@beyo/presentation-builder`; the studio's `DashboardPage` only mounts `DashboardView` and passes `navigateToEditor(id)`.
- Status derivation: Scheduled = `published` with future `starts_at`; Archived is its own chip. Grouping = one card per `logical_client_id` at highest `version`. Both are pure, unit-tested helpers written **before** components.
- Open clarification default applies: **no context menu on cards** in this phase — cards navigate only; lifecycle actions arrive in Phase 6.
- Do not build editor content, publish/archive actions, or version-history UI.
- Relational reads limited to the child plan's whitelist (`StatePill`, `BackendImage` prop surfaces; Phase 1 types/hooks).
- `data-testid` on all feature-critical elements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:presentation-builder` — dashboard suites green (helpers, controller, card variants).
- `npx playwright test --grep presentation-dashboard --project=desktop` — sign-in → grid renders → filters switch → search narrows → create navigates to `/editor/:id`.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase3_studio_dashboard_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log. Never archive/move the master.
5. Validation not green → plan stays, `Status: debugging`, defect in plan Review log, stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output, deviations with justification.
