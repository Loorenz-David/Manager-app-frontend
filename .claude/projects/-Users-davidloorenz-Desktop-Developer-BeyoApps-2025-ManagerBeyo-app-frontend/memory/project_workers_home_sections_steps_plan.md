---
name: project-workers-home-sections-steps-plan
description: Implementation plan for workers app home page — two-panel internal slide (working sections → task steps), TaskStepCard with action button, TickingTimer primitive, optimistic step state transitions
metadata:
  type: project
---

Plan file: `docs/architecture/under_construction/implementation/PLAN_workers_home_working_sections_steps_20260528.md`

Status: `under_construction` — created 2026-05-28, awaiting approval before Copilot execution.

**Why:** Workers app home screen needs to show the worker's assigned working sections and allow quick step state transitions (Start / Pause / Switch to Start) with optimistic updates.

**Key decisions captured in the plan:**
- Internal slide animation (state-based, NOT router-based) within `home/route-entry.tsx` using `AnimatePresence` + `tabVariants`
- `TickingTimer` primitive lives in `packages/lib` (hook: `useTickingElapsed`) + `packages/ui` (component: `TickingTimer`) — singleton interval, `useSyncExternalStore`
- Two first-class features: `features/working_sections/` and `features/task_steps/`
- Transition action: `POST /api/v1/tasks/{task_id}/steps/{step_id}/transition` with 4-hook optimistic pattern
- Task actions → bottom sheet surface `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` (Create Case button, no nav wired)
- Task detail → slide surface stub `TASK_STEP_DETAIL_SURFACE_ID`
- `ApiEnvelopeSchema(DataSchema).parse(response.data)` — confirmed correct usage

**How to apply:** Reference when implementing or extending the home feature, TickingTimer, or step state transition in any app.
