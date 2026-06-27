# ARCHIVE_task_note_unread_viewer_20260626_1625

## Metadata

- Archive ID: `ARCHIVE_task_note_unread_viewer_20260626_1625`
- Archived at (UTC): `2026-06-26T16:25:19Z`
- Owner agent: `codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_note_unread_viewer_20260626.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_note_unread_viewer_20260626.md`

## Outcome

- Added shared unread-note acknowledgement support in `@beyo/task-notes`, including the `read-by` mutation, optimistic cache updates, and a one-shot unread controller.
- Added a shared unread viewer sheet with a horizontal note carousel, stable measured height, note-image preview opening, and close-on-final-acknowledgement behavior.
- Wired the new surface into both managers and workers task detail surfaces with preload hooks and controller-driven opening.

## Validation

- `npm run typecheck`: pass.

## Notes

- Manual UI validation and Playwright were not run in this lifecycle pass.
