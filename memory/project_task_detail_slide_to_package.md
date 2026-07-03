---
name: project_task_detail_slide_to_package
description: "PLAN_task_detail_slide_to_package_20260703 — move TaskDetailSlidePage + flow/controller/provider + task/item mutations + ContentCard/DashedInfoGroup to packages; 41 file ops; under_construction, awaiting approval before Codex"
metadata:
  type: project
---

PLAN_task_detail_slide_to_package_20260703 moves the full TaskDetailSlidePage stack into `@beyo/tasks`, packaging all prerequisites first before moving the slide page itself.

**Why:** User explicitly requested bottom-up approach — package all dependencies first, then move the page. No props injection; package must be fully self-contained.

**Key discoveries during planning:**
- `@beyo/upholstery` already exports a package-level `ItemUpholsteryField` — the managers-app local version is a stale duplicate; slide page switches to `@beyo/upholstery`'s version.
- `SurfacePropsContext` and `SurfaceHeaderContext` are already exported from `@beyo/ui` — `useSurfaceProps`/`useSurfaceHeader` (app hooks) are replaced inline.
- `preloadPinNotificationsSlideSurface` call in `openMenu` is dropped (performance regression only; accepted).
- `pendingSeatUpholsteryKeys.all` invalidation dropped from package mutations (managers-app-specific domain; accepted).

**Architecture decisions:**
- `useUpdateItem`, `useUpdateItemPosition`, `useCreateItemUpholstery`, `useUpdateItemUpholstery` → `@beyo/tasks` (not `@beyo/items`) because they always carry a `taskId` and optimistically update `TaskDetailRaw`.
- `useUpdateItem` managers-app version is KEPT (still used by `ItemQuantitySheetPage`).
- Package mutations for upholstery include `upholsteryKeys.pickerLists()` from `@beyo/upholstery` (if dep exists in `@beyo/tasks/package.json`).
- Module-level `lazyWithPreload` instances for notes preloads inside `TaskDetailSlidePage.tsx`.

**41 file operations:** 22 create/modify across `@beyo/ui`, `@beyo/items`, `@beyo/tasks`; 15 deletes from managers app.

**How to apply:** Plan at `docs/architecture/under_construction/implementation/PLAN_task_detail_slide_to_package_20260703.md`. Awaiting user approval before Codex execution.
