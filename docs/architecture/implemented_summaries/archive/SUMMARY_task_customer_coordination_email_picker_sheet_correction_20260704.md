# SUMMARY_task_customer_coordination_email_picker_sheet_correction_20260704

## Metadata

- Summary ID: `SUMMARY_task_customer_coordination_email_picker_sheet_correction_20260704`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-04T19:38:41Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_customer_coordination_email_picker_sheet_correction_20260704.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the internal `EmailTemplatePicker` drawer flow with a registered `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` sheet surface in `@beyo/emails`.
- Added a new `EmailTemplatePickerSheetPage` that uses an inline custom header and CSS transform-based list/preview slide panels instead of `StagedForm`.
- Added localStorage memory for the last selected template name and auto-preview-on-open when a matching template exists.
- Extended customer-coordination surface openers so the slide can open the template picker sheet, task detail slide, and full image viewer.
- Wired `TaskListCard` body and image taps in the coordination task-selection step to task detail and image viewer behaviour.

## Files changed

- `packages/emails/src/surface-ids.ts`: added the email picker sheet surface ID and opener types.
- `packages/emails/src/pages/EmailTemplatePickerSheetPage.tsx`: added the registered picker sheet page with CSS slide transitions and localStorage restore.
- `packages/emails/src/components/EmailTemplatePicker.tsx`: reduced the picker to a pure trigger button that opens the registered sheet.
- `packages/emails/src/components/EmailComposer.tsx`: threaded `surfaceOpeners` through to the picker trigger.
- `packages/emails/src/index.ts`: exported surface IDs, types, and the sheet page loader.
- `packages/emails/package.json`: removed `vaul` from peer dependencies.
- `packages/task-customer-coordination/src/surface-ids.ts`: added email picker, task detail, and image viewer openers.
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-slide.controller.ts`: added task detail and image viewer helpers for task cards.
- `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailSlidePage.tsx`: passed `surfaceOpeners` into `EmailComposer` and wired task card taps.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`: registered `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` as a `sheet`.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`: added coordination slide openers for template picker, task detail, and image viewer.

## Contract adherence

- `architecture/28_surfaces_local.md`: registered the template picker as a `sheet` surface and kept the coordination flow as a `slide`.
- `architecture/30_dynamic_loading_local.md`: used `lazyWithPreload` and a `loadXxxPage()` loader for the new sheet page.
- `architecture/35_shared_packages.md`: followed the shared-package surface opener injection pattern and loader export pattern.

## Validation evidence

- `npm run typecheck`: pass, executed from repo root
- `npx playwright test --project=mobile`: not run
- `npm run test`: not run

## Known gaps or deferred items

- Browser/runtime verification of the new picker sheet animation and localStorage restore flow was not run in this pass.

## Handoff notes (if needed)

- No additional backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_task_customer_coordination_email_picker_sheet_correction_20260704_1938.md`
