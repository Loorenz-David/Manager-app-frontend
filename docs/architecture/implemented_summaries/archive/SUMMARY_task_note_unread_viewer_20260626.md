# SUMMARY_task_note_unread_viewer_20260626

## Metadata

- Summary ID: `SUMMARY_task_note_unread_viewer_20260626`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_note_unread_viewer_20260626.md`
- Implemented at (UTC): `2026-06-26T16:25:19Z`

## Implementation summary

- Added unread-note read acknowledgements to `@beyo/task-notes` with a typed `read-by` API function, an optimistic TanStack Query mutation, and a package-owned unread controller that opens once per mount through an injected app callback.
- Added `TaskNoteUnreadViewerPage` as a shared sheet surface with an Embla carousel, fixed-height measurement layer, slide indicators, note-image preview opening, and a `Got it` flow that marks each unread note as read and closes on the final acknowledgement.
- Registered and preloaded the unread viewer surface in both managers and workers task detail flows, then mounted the shared controller so unread notes open automatically from each task detail page.

## Verification

- `npm run typecheck`: passed.

## Notes

- Manual UI validation and Playwright mobile validation were not run in this lifecycle pass.
