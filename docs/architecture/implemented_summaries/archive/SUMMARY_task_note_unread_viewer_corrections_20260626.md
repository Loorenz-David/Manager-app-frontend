# SUMMARY_task_note_unread_viewer_corrections_20260626

## Metadata

- Summary ID: `SUMMARY_task_note_unread_viewer_corrections_20260626`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_note_unread_viewer_corrections_20260626.md`
- Implemented at (UTC): `2026-06-26T17:06:38Z`

## Implementation summary

- Changed `lockedEntries` in `TaskNoteUnreadViewerPage` to a nullable pre-lock state so warm-cache opens stay on the loading placeholder until unread entries are evaluated, removing the one-frame "No unread notes." flash.
- Added an acknowledged-note guard in `handleGotIt` so revisiting an already-read slide advances the carousel without firing a redundant `read-by` mutation.
- Expanded the unread-viewer indicator dots to a third visual state for acknowledged but inactive notes using `bg-primary/40`.

## Verification

- `npm run typecheck`: passed.

## Notes

- Manual UI validation and Playwright were not run in this lifecycle pass.
