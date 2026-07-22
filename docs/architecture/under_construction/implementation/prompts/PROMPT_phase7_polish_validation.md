# Codex — Phase 7: Studio polish, tests, runtime validation, hosting handoff

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–6 are implemented and archived — the creation side is feature-complete; this phase hardens it. No new features.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase7_studio_validation_polish_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — "Acceptance criteria (master-level)" (this phase is where criteria 1–6 and 9 get their final check for the creation side).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Design tokens ground truth for the fidelity pass: `docs/presentation_capability/design/README.md` — "Design tokens" tables (color/typography/radius/spacing/shadow/motion).

## Hard rules

- **Division of labor (master "Division of labor" section):** this phase is split. **Your half**: error/edge behavior pass (401 mid-session, 409 race, presigned expiry, `beforeunload`), Vitest gap-fill (pure `lib/` modules to 100% branch), Playwright consolidation with a double-run flake check, bundle/dynamic-loading verification, public-API audit, hosting handoff doc. **Claude's half (NOT yours)**: design-token fidelity fixes, a11y fixes, and any visual/state styling work — for these you **record findings** (file, location, drift/gap description) in the plan's Review log under a "For Claude" list, and change no component DOM/classes.
- **Scope discipline:** everything here must be expressible as "complete a missing behavior / fix drift from an already-approved spec". Anything else (new behavior, design change, backend question) goes into the master plan's Review log as a proposal — not into code.
- Public-API audit: apps import only from package roots; `presentation-runtime` imports nothing from `presentation-builder`; no default exports; no internal-helper leaks.
- **Carried from the Phase 1 review (master Review log)**: `packages/presentation-builder/src/types.ts` re-implements `ApiEnvelopeSchema` locally instead of reusing `@beyo/lib`'s (the shopify package reuses it via `.extend`). Fold the local copy into the `@beyo/lib` one as part of this phase's cleanup (behavior-preserving; the local copy is stricter with `ok: z.literal(true)` — keep the stricter semantics when folding).
- **Carried from the Phase 3 re-review (master Review log)**: (a) the dashboard list query uses `limit: 200` and ignores `has_more` — add load-more or an explicit overflow signal so >200 announcements never silently truncate; (b) `DashboardPage` hardcodes `workspaceName="ManagerBeyo"` — source it from the auth/workspace claim where a display name exists.
- **Carried from the Phase 2 review (master Review log)**: the studio app carries a bespoke Sonner `NotificationHostProvider` because the canonical notification host isn't exported by any shared package. During the public-API audit, assess exporting the canonical host from the shared package and switching the studio to it; if that exceeds behavior-preserving cleanup, log it in the master Review log as a proposal instead of implementing.
- The handoff doc (`docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md`) must let a cold host app mount the builder with zero repo-tribal knowledge: required providers, `@source` entries, injected callbacks (navigation, user picker if injected), env expectations.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:presentation-runtime` && `npm run test:presentation-builder` — green, coverage thresholds met.
- `npx playwright test --grep presentation- --project=desktop` — full suite green **twice consecutively**.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green **and Claude's fidelity/a11y half completed** (its outcomes recorded in the plan Review log) → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase7_studio_validation_polish_20260722.md` (include both halves' outcomes). If Claude's half is still pending, stop after your half with a report and the "For Claude" findings list — do not archive the plan.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log noting the creation side (Phases 1–7) is complete. Never archive/move the master — Phases 8–9 remain.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state, checklist outcomes, coverage/flake results, handoff doc path, deviations with justification.
