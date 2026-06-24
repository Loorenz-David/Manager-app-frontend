---
name: project-task-creation-package-abstraction
description: PLAN_task_creation_package_abstraction_20260624 — new @beyo/task-creation package bundling all 3 task-creation forms (internal/return/pre-order); 63 new files + 2 workers-app modifications; under_construction, awaiting approval before Codex
metadata:
  type: project
---

New `@beyo/task-creation` package abstracts task creation forms from manager-app into a shared package; workers-app wires "New Internal Task" button to the internal form.

**Why:** Workers need to create internal tasks from their home screen; manager-app's `@/features/task-creation` cannot be consumed by workers-app due to package/app boundary rule.

**How to apply:** Manager-app keeps its own `@/features/task-creation` unchanged. The new package is built in parallel, tested via workers-app integration only. Manager-app consumes the package in a future phase after workers-app validates the abstraction.

Plan file: `docs/architecture/under_construction/implementation/PLAN_task_creation_package_abstraction_20260624.md`

Key decisions captured in plan:
- Package is self-contained; all picker sub-surfaces (item category, working section worker, upholstery, phone country, scanner) are bundled in `taskCreationSurfaces` export
- `useCreateTask` in package is simplified (no optimistic update, broad `['tasks']` invalidation)
- Scanner surface: may be duplicate with workers-app taskStepSurfaces — check at integration time
- 2 open clarifications before final Codex execution (upholstery seat flow, worker assignment scope)
