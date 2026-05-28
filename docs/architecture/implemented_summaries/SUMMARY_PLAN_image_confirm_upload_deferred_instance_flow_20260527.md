# SUMMARY_PLAN_image_confirm_upload_deferred_instance_flow_20260527

## Metadata

- Summary ID: `SUMMARY_PLAN_image_confirm_upload_deferred_instance_flow_20260527`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T13:32:23Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_image_confirm_upload_deferred_instance_flow_20260527.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended the image confirm-upload request contract to accept deferred-instance fields: `image_client_id`, dimensions, and optional `image_annotations`, and added batch schemas plus the new `pre_confirm` upload state.
- Split the upload pipeline into a reusable pre-upload stage and kept the existing full pipeline on top of it, enabling editor-first capture flows to upload in the background before confirming later.
- Added deferred confirm orchestration to `useEntityImagesController` so `camera-to-editor` captures now close the editor immediately on Done, store annotations when needed, and confirm automatically once the upload is ready.
- Updated `ImageEditorPage` to branch between deferred confirm and persisted-image annotation mutation paths, while disabling pointless detail fetches for optimistic deferred captures.
- Added focused coverage for pre-upload behavior, batch duplicate validation, and deferred confirm payload sequencing.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/types.ts`: extended confirm-upload schemas, batch schemas, and upload states.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/lib/image-upload-pipeline.ts`: extracted `runImagePreUploadPipeline`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/api/confirm-image-upload-batch.ts`: added batch confirm API with duplicate-ID pre-validation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/actions/use-confirm-image-upload-batch.ts`: added atomic batch confirm action hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/controllers/use-entity-images.controller.ts`: added deferred upload/confirm orchestration for `camera-to-editor`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageEditorPage.tsx`: added deferred confirm save branch and disabled deferred detail fetches.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageMetadataActionsSheetPage.tsx`: added `pre_confirm` metadata label.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/notify.ts` and `src/app/providers.tsx`: added the notification helper and mounted `sonner` toaster support for action-hook error reporting.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/**/*.test.*`: added/updated focused tests for the deferred flow.

## Contract adherence

- `architecture/04_api_client.md` and `04_api_client_local.md`: new image confirm functions stay on the shared `apiClient` and keep Zod-validated request/response handling.
- `architecture/08_hooks.md` and `05_server_state.md`: the new batch confirm behavior lives in an action hook with cache seeding plus list invalidation.
- `architecture/13_errors.md` and `20_notifications.md`: batch failure is surfaced from the action layer through a single `notify.error` path.
- `architecture/15_feature_structure.md`: new logic stayed within the existing `images` feature boundaries across `api/`, `actions/`, `controllers/`, and `lib/`.

## Validation evidence

- `npm run typecheck`: pass
- `npx vitest run src/features/images/lib/image-upload-pipeline.test.ts src/features/images/api/confirm-image-upload-batch.test.ts src/features/images/controllers/use-entity-images.controller.test.tsx`: pass

## Known gaps or deferred items

- Manual smoke validation for the three editor/upload scenarios was not executed in this environment.
- The new batch confirm capability is implemented and tested at the API/action layer only; no batch UI entry point was added in this plan.
- Retry behavior after a deferred confirm failure still follows the existing optimistic upload retry model and was not expanded in this iteration.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_image_confirm_upload_deferred_instance_flow_20260527_1332.md`
