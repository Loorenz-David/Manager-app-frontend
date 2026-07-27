# SUMMARY_PLAN_31_case_type_picker_field_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_31_case_type_picker_field_20260529`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T12:09:59Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_31_case_type_picker_field_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Added case-type domain and picker support in `@beyo/cases` types layer: `CaseTypeId`, `CaseType`, `CaseTypeSchema`, `ListCaseTypesParams`, and `CaseTypeSelectedDisplay`.
- Added `case_type_id` into `CaseCreationFormSchema` so picker selection is persisted in form state.
- Extended case creation surface contracts with picker sheet support:
  - `CASE_TYPE_PICKER_SHEET_SURFACE_ID`
  - `CaseTypePickerSheetSurfaceProps`
  - `CaseCreationSurfaceOpeners`
  - `CaseCreationSlideSurfaceProps` with `entityTypes` and required `surfaceOpeners`.
- Implemented case-type server state layer:
  - `caseTypeKeys`
  - `listCaseTypes`
  - `useListCaseTypesQuery`
  - DTO transforms `toCaseTypePickerOption` and `toCaseTypeSelectedDisplay`.
- Extended `CaseCreationFormProvider` to hold picker state and injected surface opener callbacks.
- Added picker UX components:
  - `CaseTypePickerSheetContent`
  - `CaseTypePickerRouteEntry`
  - `CaseTypePickerTriggerField`
- Updated `CaseCreationFormContent` to:
  - prefetch case types on mount,
  - render trigger field,
  - include `case_type_id` in defaults,
  - clear selected case type after successful submit.
- Updated `CaseCreationRouteEntry` to consume slide surface props and pass `entityTypes`/`surfaceOpeners` into provider.
- Updated package barrel exports with all new public picker symbols.
- Added workers app integration:
  - `CaseTypePickerSheetPage`
  - sheet registration + preload export in workers `caseSurfaces`
  - case creation slide preloads picker sheet code using `usePreloadSurface`
  - task-step controller now opens case creation with `entityTypes: ["task"]` and injected `openCaseTypePicker` callback.

## Files changed

- `packages/cases/src/types.ts`
- `packages/cases/src/surface-ids.ts`
- `packages/cases/src/api/case-type-keys.ts`
- `packages/cases/src/api/list-case-types.ts`
- `packages/cases/src/api/use-list-case-types.ts`
- `packages/cases/src/lib/case-type-view-model.ts`
- `packages/cases/src/providers/CaseCreationFormProvider.tsx`
- `packages/cases/src/components/CaseTypePickerSheetContent.tsx`
- `packages/cases/src/components/CaseTypePickerRouteEntry.tsx`
- `packages/cases/src/components/CaseTypePickerTriggerField.tsx`
- `packages/cases/src/components/CaseCreationFormContent.tsx`
- `packages/cases/src/components/CaseCreationRouteEntry.tsx`
- `packages/cases/src/index.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseTypePickerSheetPage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

## Contract adherence

- `architecture/05_server_state.md`: query key factory, dedicated list query hook, and prefetch implemented correctly.
- `architecture/09_forms.md`: form-state updates done via `useFormContext` and `setValue`; schema-first form persisted.
- `architecture/24_dto.md`: API-to-UI transforms isolated in `lib/case-type-view-model.ts`.
- `architecture/28_surfaces_local.md`: picker mounted as `sheet`; close done via `requestClose`.
- `architecture/30_dynamic_loading_local.md`: sheet page uses `lazyWithPreload`; preload hook fired on slide mount.
- `architecture/35_shared_packages.md`: package-level implementation with peer-safe exports and no app alias usage inside package code.

## Validation evidence

- `npm run typecheck` (workers app): `pass`
- `npm run typecheck` (managers app): `pass`
- `npm run build` (workers app): `pass` (includes `CaseTypePickerSheetPage` chunk)
- `npm run test`: `not run`
- `npx playwright test --project=mobile`: `not run`

## Known gaps or deferred items

- Free-text "Other" label flow remains deferred.
- Participants/select-all picker flows remain deferred.
- End-to-end Playwright coverage for picker flow remains deferred.

## Handoff notes (if needed)

- To backend: `none`
- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_create_case_with_participants_contract_20260529.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_31_case_type_picker_field_20260529_1209.md`
