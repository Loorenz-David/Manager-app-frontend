# Codex — Phase 6: Preview overlay + publish flow + versioning UX

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–5 are implemented and archived (the editor is fully functional for drafting).

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase6_editor_preview_publish_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component kit (pre-built by Claude — READ-ONLY for you)

Per the master's "Division of labor" section, this phase's presentational components already exist in `packages/presentation-builder/src/components/`, design-approved: preview overlay (phone frame, progress bar, slide dots, exit/play controls), publish dialog (audience form fields, metadata fields, schedule pickers, validation-error slots), read-only banner + "Edit as new version" affordance.

- **Never** restyle, restructure markup, or edit class lists. Your job: audience mapping, publish/archive/new-version orchestration, preview playback logic (through the runtime), 422/409 cause mapping into the kit's error slots, assembly.
- Purely additive optional props allowed; anything structural/visual → plan Review log + stop for Claude. Never improvise styled components.
- If the kit is missing, STOP and report — the kit session runs before this one.

## GATE — do not start implementation until recorded

**V2 is resolved (backend team, 2026-07-22): no gate remains for it.** Publish accepts slides whose only content is composition elements; text-only timed slides are first-class. **Never mirror composition text into `slide.title`** — title is legacy metadata; the composition is the source of truth. The plan's mitigation is dropped and must not be implemented.

One gate remains — check the child plan's "Clarifications required" / master Review log:

1. **User-picker source** for `user_ids` targeting must be decided (existing package/endpoint vs. injected fetch function from the host app).

If it is missing, STOP and ask the user — do not proceed on assumptions.

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decisions #4 (publish dialog), #5 (read-only + "Edit as new version"), #11 (Scheduled), permission model.
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Design ground truth: `docs/presentation_capability/design/README.md` — "Preview overlay" section.
6. Backend: `docs/presentation_capability/backend/04_admin_presentations.md` (publish validation causes, new-version semantics, preview endpoint) + `06_admin_audience.md` (both modes, matching semantics, own-workspace-only 403 rule) + `01_concepts.md` (newest-version-wins — informs the read-only copy).

## Hard rules

- Preview renders through the shared runtime renderer — zero new element/animation rendering code. Preview entry flushes dirty slides first; include the dev-only parity assertion against `GET /{id}/preview` (stripped from prod builds).
- The publish dialog must express **every** audience form in `06_admin_audience.md`; no workspace field is shown (own-workspace-only is implied); `selected_users_only` with zero users is blocked client-side.
- Always send explicit `display_priority` on publish-time PATCH (the PATCH endpoint does not re-derive from category).
- Publish 422 causes map to visible, specific UI locations — never only a generic toast. A raced 409 lands in a friendly refetch state.
- Read-only mode: one `readOnly` flag from the controller disables every mutating control across all Phase 4–5 components; "Edit as new version" → `POST new-version` → editor re-enters edit mode on the new draft id.
- Verify the `new-version`-from-archived rule against the backend early (plan criterion 6) and record the outcome in the plan Review log.
- Relational reads per the plan's whitelist. `data-testid` on all feature-critical elements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:presentation-builder` — audience mapping, priority derivation, 422 mapping, preview playback suites green.
- `npx playwright test --grep presentation-publish --project=desktop` — full lifecycle: build 2-slide draft → preview plays through → publish role-targeted → dashboard shows Published → open read-only → Edit as new version → draft v2 editable → archive v1.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase6_editor_preview_publish_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log (include the new-version-from-archived verification outcome). Never archive/move the master.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state, new-version-from-archived outcome, files created/modified, validation output, deviations with justification.
