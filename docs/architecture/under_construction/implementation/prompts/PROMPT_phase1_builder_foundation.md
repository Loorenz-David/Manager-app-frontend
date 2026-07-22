# Codex — Phase 1: `@beyo/presentation-builder` foundation (logic layer, no UI)

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase1_builder_foundation_20260722.md`
- Governing master (authoritative for every shared decision — package boundaries, design↔backend mapping table, route ownership, permission model): `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Read before writing any code, in this order

1. The child plan above, fully.
2. The master plan — especially "Decisions resolved with the user", "Package boundaries", "Design → backend mapping", "Backend route ownership by phase".
3. `task_system/frontend_contract_goal_mapping_guide.md` — apply its pattern-authority and domain-grounding rules throughout.
4. Every contract in the child plan's "Contracts loaded" section (canonical file first, then its `_local` companion where listed; local wins on conflict).
5. Backend API contract (ground truth, nothing may be invented beyond it): `docs/presentation_capability/backend/` — `02_conventions.md`, `04_admin_presentations.md`, `05_admin_slides_media.md`, `06_admin_audience.md`, `07_enums.md`, `09_slide_composition.md`.

## Hard rules

- Implement **only** this plan's scope. No UI, no components, no pages, no surface-ids, no consumer endpoints, no `GET /history` scaffolding — later phases own those.
- File reads: contracts answer "how do I write"; implementation files answer only "what exists". The child plan's "File read intent" section whitelists the permitted relational reads — do not read outside it for style.
- Every type/field/enum must trace to the backend docs. `Invoice`-style names in contracts are teaching examples, never your domain.
- Clarifications: this plan has none open. If you hit a genuine ambiguity with no stated default, STOP and ask — do not invent requirements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors (with the new package registered).
- `npm run test:presentation-builder` — all suites green (schemas, keys, hooks, upload orchestration).
- No Playwright in this phase.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` (post-implementation steps):

1. Only once validation is fully green: write the summary at `docs/architecture/implemented_summaries/SUMMARY_presentation_phase1_builder_foundation_20260722.md` (what was built, file list, decisions taken, test results).
2. Create the archive record in `docs/architecture/archives/` per the skill.
3. Set the child plan's `Status` to `archived`, update `Last updated at`, `mv` it to `docs/architecture/archives/implementation/`, and verify it is gone from `under_construction/implementation/`.
4. Append a dated entry to the **master plan's Review log** (phase implemented, validation results, any deviations). Do not otherwise edit the master; never archive or move it.
5. If validation cannot be made green: leave the plan in `under_construction/implementation/`, set its `Status` to `debugging`, record the defect in the plan's Review log, and stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output, and any deviation from the plan with its justification.
