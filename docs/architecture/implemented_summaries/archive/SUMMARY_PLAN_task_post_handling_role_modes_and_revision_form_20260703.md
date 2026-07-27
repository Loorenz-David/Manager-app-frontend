# SUMMARY_PLAN_task_post_handling_role_modes_and_revision_form_20260703

## Metadata

- Summary ID: `SUMMARY_PLAN_task_post_handling_role_modes_and_revision_form_20260703`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-03T11:18:30Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_post_handling_role_modes_and_revision_form_20260703.md`
- Related debug plan (optional): `—`

## What was implemented

- Added role-based post-handling defaults so sellers only query and open the slide with `pending`, while managers keep the existing `pending + filled` behavior.
- Replaced the pending force-complete sheet with a form-driven pending revision sheet that fetches the task, pre-fills editable fields, highlights missing requirements, and saves only the task-type-relevant post-handling fields.
- Renamed the pending bottom action to `Pending - revision` and threaded calendar-range surface opening through the post-handling surface contracts.
- Added a follow-up improvement from David on the last implementation pass: the `TaskPostHandlingHeader` quick-filter pills now read `state (count)` for `pending` and `filled` using the existing `get-post-handling-counts` endpoint, and the manager default slide filter was tightened from `pending + filled` to `filled` only.
- Applied follow-up page styling improvements on the revision sheet: the page now uses its own inline heading instead of the sheet header title, all visible form fields are grouped inside a single shared card wrapper, and the save button plus field wrappers were aligned to that updated visual structure.

## Files changed

- `packages/tasks/src/surface-ids.ts`: added calendar-opener surface props, revision-sheet props, and slide default-state props.
- `packages/tasks/src/controllers/use-task-post-handling.controller.ts`: accepted caller-provided default active states and changed pending action routing to open the revision form.
- `packages/tasks/src/pages/PostHandlingPendingWarningSheetPage.tsx`: rewrote the page into a `react-hook-form` revision flow backed by `useGetTaskQuery` and `useUpdatePostHandling`, then refined the presentation so the page owns its own title, uses one shared field container, and removes redundant inner card styling.
- `packages/tasks/src/components/PostHandlingBottomAction.tsx`: changed the pending CTA label to `Pending - revision`.
- `packages/tasks/src/components/TaskPostHandlingHeader.tsx`: added support for pill labels that include the `pending` and `filled` counts.
- `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`: forwarded surface-provided default active states into the controller and loaded the post-handling counts query for the filter pill row.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`: added role-aware post-handling counts, calendar picker surface opening, and updated the manager default slide filter to `filled` only.

## Contract adherence

- `architecture/05_server_state.md`: reused the existing task detail and post-handling invalidation flow instead of adding a new query hook.
- `architecture/07_components.md` and `architecture/09_forms.md`: kept form state local to the page via `useForm` and `FormProvider`, while reusing package field components.
- `architecture/10_pages.md` and `architecture/28_surfaces.md`: kept the change inside the existing page/surface registration and reused the current pending-warning surface id.
- `architecture/19_permissions.md`: derived role behavior from `useRole()` and `AuthRole` without adding a separate permission registry branch.
- `architecture/14_styling.md`: consolidated the revision-sheet field presentation under one primary card container instead of duplicating card chrome on each field block.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Manual runtime verification of nested revision-sheet to calendar-picker behavior was not run in this pass.
- Playwright coverage for seller vs manager post-handling defaults, quick-filter pill counts, and the revision form flow was not added in this pass.

## Handoff notes (if needed)

- To backend: `—`
- From backend dependency: `—`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_task_post_handling_role_modes_and_revision_form_20260703_1118.md`
