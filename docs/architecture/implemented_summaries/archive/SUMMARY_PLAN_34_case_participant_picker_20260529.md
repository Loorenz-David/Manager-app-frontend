# SUMMARY_PLAN_34_case_participant_picker_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_34_case_participant_picker_20260529`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T15:42:51Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_34_case_participant_picker_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Added participant picker domain types and schemas in `@beyo/cases` (`UserCompact`, `ListUsersParams`, `ParticipantSelectedDisplay`, `ParticipantSelectionResult`).
- Added users list API stack (`userKeys`, `listUsers`, `useListUsersQuery`) and participant view-model mapping helper.
- Extended case surface contracts with `PARTICIPANT_PICKER_SLIDE_SURFACE_ID`, `ParticipantPickerSlideSurfaceProps`, and `openParticipantPicker` opener.
- Extended `CaseCreationFormProvider` state with `selectedParticipants` and `participantsTotalCount` lifecycle state.
- Implemented `ParticipantPickerTriggerField` with count label, up-to-3 selected `UserPill`s, and overflow pill.
- Implemented `ParticipantPickerSlideContent` with search, select-all/deselect-all, per-user toggle, dirty-save behavior, and close-on-save.
- Added `ParticipantPickerRouteEntry` and exported new public API from `packages/cases/src/index.ts`.
- Integrated trigger + users prefetch + reset-on-submit behavior into `CaseCreationFormContent`.
- Added workers page `ParticipantPickerSlidePage`, registered slide surface in workers cases surfaces, preloaded it in case creation slide page, and wired opener in task step detail controller.

## Files changed

- `packages/cases/src/types.ts`
- `packages/cases/src/api/user-keys.ts`
- `packages/cases/src/api/list-users.ts`
- `packages/cases/src/api/use-list-users-query.ts`
- `packages/cases/src/lib/user-view-model.ts`
- `packages/cases/src/surface-ids.ts`
- `packages/cases/src/providers/CaseCreationFormProvider.tsx`
- `packages/cases/src/components/ParticipantPickerTriggerField.tsx`
- `packages/cases/src/components/ParticipantPickerSlideContent.tsx`
- `packages/cases/src/components/ParticipantPickerRouteEntry.tsx`
- `packages/cases/src/components/CaseCreationFormContent.tsx`
- `packages/cases/src/index.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/ParticipantPickerSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

## Validation

- `npm run typecheck` passed in managers app.
- `npm run typecheck` passed in workers app.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_34_case_participant_picker_20260529_1542.md`
