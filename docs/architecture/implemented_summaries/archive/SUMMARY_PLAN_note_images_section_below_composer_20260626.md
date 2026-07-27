# SUMMARY_PLAN_note_images_section_below_composer_20260626

## Metadata

- Summary ID: `SUMMARY_PLAN_note_images_section_below_composer_20260626`
- Status: `implemented`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T13:46:03Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_note_images_section_below_composer_20260626.md`

## Implementation summary

- Added `hideAddButton` to `ImagePreviewGrid` and created `TaskNoteImagesSection` in `@beyo/task-notes` so note images render only when present and never expose a second add-entry button.
- Moved note images out of the shared item-images `ContentCard` and placed the note image section directly below `TaskNoteComposer` in the Internal, PreOrder, and Return task creation forms.
- Moved the composer camera button to the shared right-side action slot and kept the focused-state done button there, with the `Check` icon rendered using `text-card`.
- Threaded the authenticated user client id from `useAuthStore(selectUser)` through `TaskCreationFormProvider` into note payload building so `users_read_list` is populated with the current user id when available.

## Verification

- `npm run typecheck`: passed.

## Notes

- Playwright and manual runtime validation were not run in this lifecycle pass.
