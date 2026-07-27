# SUMMARY_PLAN_16_case_task_info_bottom_sheet_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_16_case_task_info_bottom_sheet_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T07:58:15Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_16_case_task_info_bottom_sheet_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a new cases `sheet` surface for task info so the conversation header info button opens a bottom sheet instead of the previous controller stub.
- Built a compact linked-task card that shows image or placeholder, task state, task type, return source, and article/SKU context, then opens the existing task detail slide.
- Extended the mobile cases Playwright flow to verify the bottom sheet renders the expected task context and that tapping the card closes the sheet while keeping the conversation slide below the task detail slide.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`: registered the new `case-task-info-sheet` surface and its props.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: replaced the temporary `openInfo` stub with the real surface open action.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoCard.tsx`: added the compact linked-task card with image, labels, state pill, and open affordance.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoSheetContent.tsx`: added the sheet body with loading, error, and open-task behavior.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTaskInfoSheetPage.tsx`: added the thin sheet page wrapper with header title and task query wiring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new case task-info surface identifiers and types.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: added a stable slide test ID so stacked-surface assertions can target the task detail surface.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added mobile coverage for the info-sheet open/render/open-task flow.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 16 linkage and implementation progress note.

## Contract adherence

- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`: reused the existing `TASK_DETAIL_SURFACE_ID` slide instead of adding route navigation or a duplicate task-detail entry point.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/lib/task-detail.ts`: reused the established task-type, return-source, and state humanization helpers for consistent labels and pill variants.
- `apps/managers-app/ManagerBeyo-app-managers/src/providers/SurfaceProvider.tsx`: kept the feature on the existing surface stack semantics by closing the sheet and opening task detail through the standard surface API.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The sheet is intentionally read-only in this plan; editing the task and broader case settings remain deferred.
- The conversation body is still the PLAN 15 placeholder shell, so task info is the only additional conversation-side action added here.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_16_case_task_info_bottom_sheet_20260526.md`
