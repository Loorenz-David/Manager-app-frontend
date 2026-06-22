---
name: project-complete-step-confirmation
description: PLAN_complete_task_step_confirmation_20260622 — new confirmation slide before completing a task step in workers app; 6 files (1 new)
metadata:
  type: project
---

PLAN_complete_task_step_confirmation_20260622 — workers app, `task_steps` feature.

**Why:** Workers need to declare whether the recorded time is accurate before completing a step, so managers can flag unreliable time records.

**How to apply:** The plan is at `docs/architecture/under_construction/implementation/PLAN_complete_task_step_confirmation_20260622.md`. Status: `under_construction`, awaiting user approval before Codex execution.

Files changed (6):
1. `src/features/task_steps/types.ts` — add `totalPauseSeconds` to `TaskStepCardViewModel` + `mark_closing_record_inaccurate?` to `TransitionStepStateInput`
2. `src/features/task_steps/surface-ids.ts` — add `COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID` + `CompleteTaskStepConfirmationSlideSurfaceProps`
3. `src/features/task_steps/surfaces.ts` — register new slide with `lazyWithPreload`
4. `src/features/task_steps/controllers/use-task-step-detail.controller.ts` — `handleComplete` opens the slide instead of directly transitioning
5. `src/pages/task_steps/TaskDetailSlidePage.tsx` — replace `ConfirmActionButton` with plain green button
6. (NEW) `src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx` — stat boxes (working=bluish, paused=yellow) + accurate/inaccurate radio options + save footer
