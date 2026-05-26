# PLAN_16_case_task_info_bottom_sheet_20260526

## Metadata

- Plan ID: `PLAN_16_case_task_info_bottom_sheet_20260526`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-26T00:00:00Z`
- Last updated at (UTC): `2026-05-26T00:00:00Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/intention_of_cases.md`

## Goal and intent

- Goal: Implement the info-button bottom sheet that exposes the linked task context from inside a case conversation.
- Business/user intent: Managers need one tap access to the operational task context without leaving the chat immediately.
- Non-goals: No participant management or case settings UI yet.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTaskInfoSheetPage.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoCard.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoSheetContent.tsx`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`
- Out of scope:
  - Editing the task
  - Extra case settings
  - Participant controls
- Assumptions:
  - PLAN_15 resolves `taskId` in the conversation controller.
  - Existing task detail surface remains the canonical task deep-detail experience.

## Clarifications required

_(none)_

## Acceptance criteria

1. Tapping the conversation info button opens a bottom sheet.
2. The sheet shows linked task context: image, task state, task type, return source, article number or SKU.
3. Tapping the task card opens the existing task detail slide using the same surface pattern as the tasks feature.
4. The sheet closes cleanly before or while opening task detail so the stack does not become awkward.

## Runtime validation (Playwright)

### Build rules

- Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-conversation.spec.ts` or add `case-task-info.spec.ts` if the flow grows too large.
- Use the existing sheet assertions/helpers patterns already present in the repo.
- Mock task detail data deterministically; do not depend on a live task.

### Required test IDs

- `case-task-info-sheet`
- `case-task-info-card`
- `case-task-info-image`
- `case-task-info-state`

### Required scenarios

1. Tapping the info button opens the bottom sheet.
2. The sheet renders task image or placeholder, task state, task type, return source, and article/SKU.
3. Tapping the task info card closes the sheet and opens `task-detail-slide`.

### Runtime assertions

- Assert the sheet is visible before interaction and gone after task-detail open.
- Assert stacked surfaces keep correct order: conversation slide remains below task detail.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: sheet content remains a feature component
- `architecture/23_providers.md`: avoid leaking controller logic into the page
- `architecture/28_surfaces.md`: surface registration and sheet semantics
- `architecture/30_dynamic_loading.md`: lazy-loaded sheet page

### Local extensions loaded

- `architecture/28_surfaces_local.md`: app-specific `sheet` behavior
- `architecture/30_dynamic_loading_local.md`: use `lazyWithPreload`

### File read intent - pattern vs. relational

Permitted relational reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx` - exact task-card interaction expectations
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` - the existing `TASK_DETAIL_SURFACE_ID`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailMenuSheetPage.tsx` - how sheets close and open other surfaces

## Implementation plan

1. Register a new cases sheet surface for task info.
2. Build a compact task-context card tuned for the case sheet, not a copy of the full list card.
3. Wire the card tap to the existing task detail slide.

## Step-by-step file-level instructions

1. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
   - Add `CASE_TASK_INFO_SHEET_SURFACE_ID = 'case-task-info-sheet'`.
   - Add `CaseTaskInfoSheetSurfaceProps` with:
     - `caseClientId: string`
     - `taskId: string`
   - Register the page as a `sheet` surface with `lazyWithPreload`.

2. `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTaskInfoSheetPage.tsx`
   - Read props with `useSurfaceProps<CaseTaskInfoSheetSurfaceProps>()`.
   - Use `useSurfaceHeader()` to set a concise sheet title such as `Task info`.
   - Render missing-ID fallback if `taskId` is absent.
   - Query the task with `useGetTaskQuery(taskId)`.
   - Keep the page thin; move actual rendering into a feature component.

3. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoSheetContent.tsx`
   - Props:
     - `taskId: string`
     - `taskDetail: GetTaskResult`
   - Own the loading, error, and empty-task-context branches for the sheet body.
   - Read-only content only in this plan.

4. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseTaskInfoCard.tsx`
   - Render:
     - task image from `item_images[0]` if available, otherwise placeholder
     - article number or SKU as the main label
     - task type and optional return source as subtitle
     - task state pill
   - Use the app token colors and the same image-placeholder primitive style used in tasks.
   - Add a clear tap affordance and `data-testid`.

5. Task-detail opening behavior
   - Inside `CaseTaskInfoSheetContent`, use `useSurface()`.
   - On tap:
     - close `CASE_TASK_INFO_SHEET_SURFACE_ID`
     - open `TASK_DETAIL_SURFACE_ID` with `{ taskId }`
   - This should mirror the existing tasks surface usage rather than introducing route navigation.

6. `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`
   - Replace the PLAN_15 temporary `openInfo` stub with a real `surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, { caseClientId, taskId })`.
   - Guard against `taskId === null`; the button should remain disabled in that case.
