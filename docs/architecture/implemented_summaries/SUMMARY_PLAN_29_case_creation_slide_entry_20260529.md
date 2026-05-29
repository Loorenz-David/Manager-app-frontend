# SUMMARY_PLAN_29_case_creation_slide_entry_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_29_case_creation_slide_entry_20260529`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T10:53:58Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_29_case_creation_slide_entry_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Added a new case creation slide surface entry in `@beyo/cases` by introducing `CASE_CREATION_SLIDE_SURFACE_ID` and empty `CaseCreationSlideSurfaceProps`.
- Added `CaseCreationView` and `CaseCreationRouteEntry` in `@beyo/cases` and exported them from the package barrel.
- Added workers route constant and builder for `/cases/new`.
- Added workers page wrapper `CaseCreationSlidePage` using `CaseCreationRouteEntry`.
- Registered a new case creation slide surface in workers `caseSurfaces` using `lazyWithPreload` and `path: () => buildCaseCreationRoute()`.
- Added router route for `/cases/new` before `/cases/:caseId`.
- Added `handleOpenCaseCreation` in task-step detail controller and exposed it in provider context.
- Added `MessageSquareMore` icon button in `TaskStepDetailHeader` to open case creation.

## Files changed

- `packages/cases/src/surface-ids.ts`: added `CASE_CREATION_SLIDE_SURFACE_ID` and `CaseCreationSlideSurfaceProps`.
- `packages/cases/src/components/CaseCreationView.tsx`: added placeholder case creation view (`data-testid="case-creation-view"`).
- `packages/cases/src/components/CaseCreationRouteEntry.tsx`: added route entry wrapper.
- `packages/cases/src/index.ts`: exported case creation route entry and surface id/props.
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`: added `ROUTES.caseCreation` and `buildCaseCreationRoute()`.
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx`: added slide page wrapper.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`: registered case creation slide surface and preload export.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/router.tsx`: added route for `/cases/new` before dynamic case conversation route.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`: added `handleOpenCaseCreation` and surface open call.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailHeader.tsx`: added `MessageSquareMore` trigger button.

## Contract adherence

- `architecture/16_feature_workflow.md`: implementation followed controller/component/page/router order.
- `architecture/11_routing.md`: route constants used and explicit route ordering respected for static `/cases/new` before dynamic `/cases/:caseId`.
- `architecture/28_surfaces_local.md`: new surface uses `slide` with `path` and registry wiring.
- `architecture/30_dynamic_loading_local.md`: slide component registered via `lazyWithPreload`.
- `architecture/35_shared_packages.md`: case creation scaffold added in package source with exports from package barrel.

## Validation evidence

- `npm run typecheck` (workers app): `pass`
- `npm run typecheck` (managers app): `pass`
- `npm run test`: `not run`
- `npx playwright test --project=mobile`: `not run`
- `npx playwright test --project=desktop`: `not run`

## Known gaps or deferred items

- Case creation form fields, validation, mutation, and task-linking are deferred to a follow-up plan.
- No Playwright coverage was added in this scaffold phase.

## Handoff notes (if needed)

- To backend: `none`
- From backend dependency: `none`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_29_case_creation_slide_entry_20260529_1053.md`
