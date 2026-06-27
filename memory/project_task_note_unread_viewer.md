---
name: project-task-note-unread-viewer
description: "PLAN_task_note_unread_viewer_20260626; carousel viewer for unread notes + controller + read-by API; 11 files; awaiting approval before Codex"
metadata:
  type: project
---

PLAN_task_note_unread_viewer_20260626 authored 2026-06-26; status under_construction, awaiting approval.

**Why:** Workers and managers need an automatic prompt when a task they open has unread notes. The unread viewer sheet appears on page load (not tap-triggered) and lets users acknowledge notes one by one.

**How to apply:** When user asks to implement this feature, refer to `docs/architecture/under_construction/implementation/PLAN_task_note_unread_viewer_20260626.md`.

11 files (4 new, 7 modified):
- NEW `packages/task-notes/src/api/mark-task-note-read-by.ts` — POST read-by endpoint
- NEW `packages/task-notes/src/api/use-mark-task-note-read-by.ts` — optimistic action hook (adds userId to users_read_list in cache; invalidates on settled)
- NEW `packages/task-notes/src/controllers/use-task-notes-unread.controller.ts` — detects unread notes, fires `onOpen(props)` once per mount; apps provide the surface.open callback (contract 35 §13)
- NEW `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` — embla carousel of unread notes; hidden measurement layer fixes sheet height to tallest note; dot indicator; "Got it" button
- MODIFIED `packages/task-notes/src/surface-ids.ts` — add `TASK_NOTE_UNREAD_VIEWER_SURFACE_ID` + `TaskNoteUnreadViewerSurfaceProps` + preload fn
- MODIFIED `packages/task-notes/src/index.ts` — export new API, controller, surface-id, page
- MODIFIED `packages/task-notes/package.json` — add `embla-carousel-react` peer dep
- MODIFIED `apps/managers-app/.../features/tasks/surfaces.ts` — register surface + export preload
- MODIFIED `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — mount controller + preload
- MODIFIED `apps/workers-app/.../features/task_steps/surfaces.ts` — register surface + export preload
- MODIFIED `apps/workers-app/.../pages/task_steps/TaskDetailSlidePage.tsx` — mount controller + preload

Key design decisions:
- `lockedEntries` state: unread note list locked on first query resolution; carousel list never mutates mid-session
- `acknowledgedIds` set: tracks which notes got "Got it" in this session; closes surface when size >= lockedEntries.length
- `hasFiredRef` in controller: prevents re-trigger on re-renders or subsequent query updates
- `onOpenRef` pattern in controller: avoids adding unstable `onOpen` callback to useEffect deps

[[project-task-notes-sheet-page-plan]]
