# SUMMARY_PLAN_upholstery_warning_sheet_20260602

## Metadata

- Summary ID: `SUMMARY_PLAN_upholstery_warning_sheet_20260602`
- Status: `summarized`
- Owner agent: `Codex (GPT-5)`
- Created at (UTC): `2026-06-02T17:37:51Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_warning_sheet_20260602.md`

## What was implemented

- Extracted a shared `UpholsteryEntryCard` from the workers detail view into `@beyo/tasks`, then reused it for both the detail section and the new warning sheet so upholstery rows render identically in both places.
- Extended case-creation surfaces and provider state in `@beyo/cases` so a warning flow can open the case creation slide with a pre-selected `No Fabric` type and a pre-filled initial composer message.
- Added a new workers-app upholstery warning sheet that lists unavailable upholstery entries, detects existing `no_fabric` cases for the task, and routes the worker to either `View case` or `Create case`.
- Inserted a second-stage `pending -> working` guard in both task-step controllers so the existing dependency warning runs first and the upholstery warning runs immediately after it for Sewing and Upholstery Installation steps with no available requirement.

## Files changed

- `packages/tasks/src/components/UpholsteryEntryCard.tsx`: added the shared upholstery card component and exported entry type.
- `packages/tasks/src/index.ts`: exported the shared upholstery card API.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepUpholsterySection.tsx`: switched the detail section to the shared upholstery card.
- `packages/cases/src/surface-ids.ts`: added optional initial case-type and composer-content props for case creation.
- `packages/cases/src/providers/CaseCreationFormProvider.tsx`: seeded selected case type and composer state from incoming surface props.
- `packages/cases/src/components/CaseCreationRouteEntry.tsx`: passed initial case data into the form provider.
- `packages/cases/src/components/CaseCreationFormContent.tsx`: initialized form defaults from the preselected case type.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/lib/step-transition-guards.ts`: added shared helper logic for upholstery-section matching and availability checks.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`: added the upholstery warning sheet surface ID and props type.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`: registered the new warning sheet surface.
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/UpholsteryWarningSheetPage.tsx`: added the warning sheet UI and case-routing logic.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`: added the upholstery warning guard after the dependency warning in the section list flow.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`: added the upholstery warning guard after the dependency warning in the detail flow.

## Contract adherence

- `architecture/07_components.md`: moved the upholstery card into a reusable presentational component and reused it across surfaces instead of duplicating markup.
- `architecture/08_hooks.md`: kept the new start-interception logic inside controllers and reused existing mutation hooks rather than branching transition behavior inside UI components.
- `architecture/23_providers.md`: added initial case-creation state at the provider boundary so downstream components can stay context-driven.
- `architecture/24_dto.md`: built a structured `CaseMessageContent` payload for the pre-filled No Fabric message rather than passing raw text through ad hoc props.
- `architecture/28_surfaces.md` and `architecture/28_surfaces_local.md`: registered the warning as a `sheet` surface through the existing lazy surface registry.

## Validation evidence

- `npm run typecheck`: `pass` in `apps/workers-app/ManagerBeyo-app-workers`
- `npm run typecheck` at frontend root: `not available` (`package.json` has no root `typecheck` script)
- `npm run test`: `not run`
- `npx playwright test --project=mobile`: `not run`

## Known gaps or deferred items

- No runtime manual validation was run for the upholstery warning, case prefill, or post-create close behavior in this pass.
- The current implementation intentionally re-shows the warning on repeated start attempts until the worker files/views the case or upholstery availability changes.

## Handoff notes (if needed)

- Related backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_transition_step_state_contract_20260528.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_upholstery_warning_sheet_20260602_1737.md`
