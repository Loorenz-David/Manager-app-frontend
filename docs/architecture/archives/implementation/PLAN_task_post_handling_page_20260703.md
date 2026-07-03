# PLAN_task_post_handling_page_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_page_20260703`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T08:31:33Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_task_post_handling_20260701`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_task_post_handling_page_20260703.md`

## Goal and intent

- Goal: Consume the new task post-handling backend surface (`assortment` field,
  `task.post_handling` payload, `post_handling_states` list filter, complete endpoint) and add a
  manager-facing post-handling worklist as a `@beyo/tasks` package slide page, plus a `HomeView`
  entry button.
- Business/user intent: Give managers a single scroll-and-filter surface to see tasks that have an
  open post-handling instance and mark them completed (with an explicit override path for tasks
  still in `pending`).
- Non-goals:
  - No post-handling *edit* UI (fulfillment/schedule/task_type/assortment editing via
    `PATCH /tasks/{id}/post-handling`) — the handoff describes it, but this plan only reads
    `assortment` and drives the *complete* action.
  - No personalization of the pending-warning copy (explicitly deferred by the intention).
  - No workers-app wiring (managers only).

## Scope

- In scope:
  - `@beyo/tasks` schema + API + action + query hook + controller + page + surface wiring.
  - Managers-app surface registration + `HomeView` button.
- Out of scope:
  - `apps/managers-app/.../features/tasks/*` view-model/store changes (the package page renders
    directly from raw list items, like `QuickTaskAssignSlidePage`).
  - Workers/sellers apps.
- Assumptions:
  - `assortment` is now always present in task payloads (handoff: "Task payloads now include
    `assortment`"). Schema uses `.nullable()`; see Risks for the `.optional()` fallback.
  - The package already ships TanStack Query actions/hooks (`use-update-task-schedule`,
    `use-get-task-query`), so a new infinite list query + mutation in the package is idiomatic.
  - `@beyo/tasks` is already registered as a package dependency + `@source` in the managers app
    (no new package plumbing required).

## Clarifications required — RESOLVED 2026-07-03

- [x] **Default active pills on open** → `pending` + `filled` active; `completed` available but off.
- [x] **Which post-handling instance drives the card action** → the **first non-completed** instance
  (state `pending` or `filled`); if all instances are `completed`, the bottom action renders a
  disabled "Completed" state.
- [x] **Pending-warning surface** → a **package-defined sheet page** registered by the app and
  opened via injected `surfaceOpeners` (Contract 35 §13/§14) — NOT an in-page Vaul drawer. The
  package exposes `PostHandlingPendingWarningSheetPage` + a loader; the app registers the sheet and
  injects `openPendingWarning`.
- [x] **`filled` completion** → tapping a `filled` card's bottom action completes immediately with
  `force: false`, no confirmation. Only `pending` opens the warning sheet.

## Acceptance criteria

1. `GET /tasks/{id}` and `GET /tasks` responses parse with `assortment` and `task.post_handling`
   present; `npm run typecheck` is clean across the monorepo.
2. `listTasks` sends `post_handling_states` as a CSV query param when provided.
3. Opening the `HomeView` "Post-handling" button (lucide `notepad-text`, below Ordering) opens a
   slide with its own absolute header (SearchBar + scroll-reactive pill row) and a
   `PullToRefresh` body of `TaskListCard`s.
4. Pills reflect enum order, multi-select, and enforce ≥1 active; toggling refetches the list with
   the new `post_handling_states` CSV. Typing in the search bar debounces and injects `q`.
5. `TaskListCard` actions (open detail, open image viewer, open task actions) work via injected
   `surfaceOpeners`, identical in behavior to `TasksView`.
6. Card bottom action: `filled` → completes (`force:false`); `pending` → shows the warning, whose
   confirm button completes with `force:true`. On success the list invalidates and the task drops
   out (when `completed` is not an active filter).
7. Playwright mobile + desktop specs for the flow pass.

## Contracts and skills

### Output format — contract selection

Domain schemas consulted:
- `packages/tasks/src/types.ts`: entity/field names — `TaskDetailRawSchema`,
  `TaskListItemRawSchema` (task object holds `assortment`, `post_handling`), `ListTasksFullParams`,
  `TASK_TYPE/STATE/RETURN_SOURCE`, `TaskListItemRaw.primary_item`, `item_images`. New enum
  `POST_HANDLING_STATE = ["pending","filled","completed"]` and `TaskPostHandlingSchema`
  (`client_id`, `task_id`, `state`, `created_at`, `updated_at`).

Selected contracts (core, always):
- `architecture/01_architecture.md` + `_local`: layering + route-entry pattern.
- `architecture/02_types.md`: enum + Zod schema conventions.
- `architecture/04_api_client.md` + `_local`: `apiClient.get/post`, envelope, flat error shape.
- `architecture/05_server_state.md`: infinite query + query keys for the list query hook.
- `architecture/06_client_state.md`: local pill/search state.
- `architecture/08_hooks.md`: `useCompletePostHandling` mutation (snapshot/rollback/invalidate).
- `architecture/13_errors.md`: complete-action error handling (400 pending→completed, 404).
- `architecture/15_feature_structure.md`: file placement inside the package.

Added from guide (triggered):
- `architecture/35_shared_packages.md` §13 (surfaceOpeners injection — TaskListCard actions) and
  §14 (page loader / code-split via `loadTaskPostHandlingSlidePage`). Trigger: "package page",
  "surfaceOpeners", "openSurface from package".
- `architecture/36_scroll_visibility.md`: `useScrollHide` relative-mode pill row + `PullToRefresh`
  scroll registration. Trigger: "scroll visibility", "useScrollHide", "PullToRefresh registration".
- `architecture/28_surfaces.md` + `_local`: slide surface types (`slide`, `sheet`).
- `architecture/30_dynamic_loading.md` + `_local`: `lazyWithPreload` + package loader function.
  Trigger: "lazy load", "surface preload".
- `architecture/18_performance.md`: memoized card mapping.
- `architecture/27_responsive.md`, `31_animations.md`, `32_loading_skeletons.md`,
  `33_vaul_drawer.md`: surface UI, pill animation, loading skeletons, and (if in-page warning
  chosen) the Vaul drawer for the pending-warning sheet.
- `architecture/37_keyboard_aware_inputs.md`: search input on a mobile slide surface.
- `architecture/34_runtime_validation.md` + `_local`: Playwright specs, testids, fixtures.

Excluded contracts:
- `09_forms.md`, `24_dto.md`: no react-hook-form and no view-model transformer — the page renders
  raw list items directly (mirrors `QuickTaskAssignSlidePage`).
- `12_auth.md`, `19_permissions.md`, `21_realtime.md`: no auth/permission/socket work
  (realtime `task_post_handling:completed` is handled by existing task subscriptions; we only
  invalidate on mutation success).

Read order (local precedence):
- Canonical first, then `_local` for: `01`, `04`, `28`, `30`, `34`. Local overrides baseline only
  for this app.

### File read intent — pattern vs. relational

Relational reads already performed (what exists): `packages/tasks/src/types.ts`,
`api/list-tasks.ts`, `api/get-task.ts`, `api/task-keys.ts`, `components/TaskListCard.tsx`,
`pages/TaskScheduledDeliverySheetPage.tsx`, `surface-ids.ts`, `index.ts`,
`actions/use-update-task-schedule.ts`, `api/update-task-schedule.ts`,
`packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx`,
`apps/.../features/tasks/surfaces.ts`, `.../controllers/use-tasks-view.controller.ts`,
`.../flows/use-tasks-page.flow.ts`, `.../features/home/components/HomeView.tsx`,
`components/primitives/search-bar/SearchBar.tsx`. No additional pattern reads required — action
hook / query hook / surfaceOpeners structure is covered by contracts `08`, `05`, `35`.

### Skill selection

- Primary skill: none (documentation/plan authoring only). Codex executes against contracts.
- Excluded: `code-review`, `verify` — post-implementation, not part of authoring.

## Implementation plan

Build bottom-up (types → api → query/action → controller → components → page → surface → app).

### A. `@beyo/tasks` schema + params — `packages/tasks/src/types.ts`

1. Add the enum + type:
   ```ts
   export const POST_HANDLING_STATE = ["pending", "filled", "completed"] as const;
   export type PostHandlingState = (typeof POST_HANDLING_STATE)[number];
   ```
2. Add the schema (place near the other list schemas):
   ```ts
   export const TaskPostHandlingSchema = z.object({
     client_id: z.string(),
     task_id: z.string(),
     state: z.enum(POST_HANDLING_STATE),
     created_at: z.string().datetime({ offset: true }),
     updated_at: z.string().datetime({ offset: true }).nullable(),
   });
   export type TaskPostHandling = z.infer<typeof TaskPostHandlingSchema>;
   ```
3. In `TaskDetailRawSchema.task`, add:
   ```ts
   assortment: z.string().nullable(),
   post_handling: z.array(TaskPostHandlingSchema),
   ```
4. In `TaskListItemRawSchema.task`, add:
   ```ts
   assortment: z.string().nullable(),
   post_handling: z.array(TaskPostHandlingSchema).nullable(),
   ```
   (`null` when the list filter is absent; array when present — per handoff.)
5. Extend `ListTasksFullParams` with `post_handling_states?: string;`.

### B. API — list filter + complete endpoint

6. `packages/tasks/src/api/list-tasks.ts` — add:
   ```ts
   if (params.post_handling_states) queryParams.post_handling_states = params.post_handling_states;
   ```
7. NEW `packages/tasks/src/api/complete-post-handling.ts`:
   ```ts
   const CompletePostHandlingResponseSchema = ApiEnvelopeSchema(
     z.object({ client_id: z.string() }),
   ).extend({ ok: z.literal(true) });

   export type CompletePostHandlingInput = {
     taskId: string;
     post_handling_id?: string | null;
     force?: boolean;
   };

   export async function completePostHandling({ taskId, post_handling_id, force = false }: CompletePostHandlingInput) {
     return apiClient.post(
       `/api/v1/tasks/${taskId}/post-handling/complete`,
       CompletePostHandlingResponseSchema,
       { ...(post_handling_id ? { post_handling_id } : {}), force },
     );
   }
   ```

### C. Action + list query hook (package)

8. NEW `packages/tasks/src/actions/use-complete-post-handling.ts` — `useMutation` per `08_hooks.md`:
   `mutationFn: completePostHandling`; `onSettled` invalidates `taskKeys.lists()` and
   `taskKeys.detail(taskId)`. (No optimistic list mutation needed; invalidate is sufficient and
   safe against the array-of-instances shape.) Surface `isPending` per task via the returned
   mutation so the controller can track the in-flight task id.
9. NEW `packages/tasks/src/api/use-list-post-handling-tasks-query.ts` — `useInfiniteQuery`
   per `05_server_state.md`, calling `listTasks`, keyed with the existing `taskKeys.list(params)`,
   `getNextPageParam` from `has_more`/`offset`/`limit` (mirror the app's existing
   `use-list-tasks-query` paging contract). Params include `post_handling_states`, `q`, `limit`.
   Return `{ query, loadMore }`.

### D. Controller (package) — `packages/tasks/src/controllers/use-task-post-handling.controller.ts`

10. NEW controller. Inputs: `{ surfaceOpeners: TaskPostHandlingSurfaceOpeners }`. Responsibilities:
    - Pill state: `Set<PostHandlingState>` initialized to `["pending","filled"]`;
      `toggleState` refuses to drop below one active state (enforce ≥1).
    - Search: `q` + 300ms debounce (mirror `use-tasks-page.flow.ts`).
    - Build `params` memo: `{ post_handling_states: [...active].join(","), q: debouncedQ || undefined }`
      (states joined in enum order).
    - Call `useListPostHandlingTasksQuery(params)`; expose `tasks` (flattened raw list items),
      `isInitialLoading`, `isError`, `hasMore`, `isFetchingMore`, `loadMore`, `refetch`.
    - `useCompletePostHandling` wiring: expose `completingTaskId`, `handleComplete(taskId, instance, force)`.
    - Action passthroughs to `surfaceOpeners`: `openTaskDetail`, `openTaskActions`, `openImageViewer`,
      `closeSurface` (all optional, called with `?.()`).
    - Helper `resolveActiveInstance(post_handling)`: first instance whose state !== "completed"
      (per clarification #2), else null.

### E. Components (package)

11. NEW `packages/tasks/src/components/TaskPostHandlingHeader.tsx` — absolute header:
    - `SearchBar` (from `@beyo/ui`) bound to `q`/`setQ`, `isLoading`.
    - Below it, a horizontally-scrollable pill row rendering `POST_HANDLING_STATE` in order; each
      pill toggles via controller, active styling; the row is the scroll-reactive element.
    - Follow `TasksHeader` composition; expose a fixed `--type-picker-height`-style CSS var target
      so the page's translate math matches `TasksView`.
12. NEW `packages/tasks/src/components/PostHandlingBottomAction.tsx` — the `bottomAction` node:
    - Props: `{ instance: TaskPostHandling | null; isCompleting: boolean; onComplete: () => void; onRequestPendingWarning: () => void; }`.
    - `completed`/null → disabled "Completed" affordance (or nothing, per clarification #2).
    - `filled` → button "Complete" → `onComplete()` (force:false).
    - `pending` → button (e.g. "Pending — review") → `onRequestPendingWarning()`.
    - Add `data-testid={`post-handling-action-${taskId}`}`.
13. NEW `packages/tasks/src/pages/PostHandlingPendingWarningSheetPage.tsx` — a **package sheet
    page** (not an in-page drawer). Reads `useSurfaceProps<TaskPostHandlingPendingWarningSheetSurfaceProps>()`
    and `useSurfaceHeader()`; renders generic pending copy + a confirm button that calls
    `props.onConfirm()` then `header?.requestClose()`, plus a cancel/close. The `onConfirm` closure
    is created in the list page (where the mutation is in scope) and passed through surface props —
    the §13 `onSelect`-closure pattern. `data-testid="post-handling-pending-warning-sheet-page"`.

### F. Page (package) — `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

14. NEW page, structured like `TasksView` + `QuickTaskAssignSlidePage`:
    - `const props = useSurfaceProps<TaskPostHandlingSlideSurfaceProps>();`
    - `const header = useSurfaceHeader();` and `useEffect` to `header?.setHeaderHidden(true)` on
      mount, restore on unmount (the page owns its header — mirror `QuickTaskAssignSlidePage`).
    - `const controller = useTaskPostHandlingController({ surfaceOpeners: props.surfaceOpeners });`
    - `const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();`
    - Absolute header (`TaskPostHandlingHeader`) wrapped in the same translate/`--scroll-hide-progress`
      container as `TasksView`.
    - `PullToRefresh` with `indicatorOffset` (~176) + top padding for the absolute header; map
      `controller.tasks` → `TaskListCard`, resolving `imageUrl` from `item_images` and wiring
      `onTapCard`/`onTapActions`/`onTapImage` exactly like `QuickTaskAssignSlidePage` (image closure
      builds `{client_id,image_url}[]` and calls `surfaceOpeners.openImageViewer`).
    - Pass `bottomAction={<PostHandlingBottomAction ... />}` per card, driven by
      `resolveActiveInstance(card.task.post_handling ?? [])`.
    - For a `pending` card, `onRequestPendingWarning` calls
      `props.surfaceOpeners.openPendingWarning?.({ taskId, onConfirm: () => controller.handleComplete(taskId, instance, true) })`.
      The `onConfirm` closure force-completes via the controller's mutation (in scope here).
    - Loading skeletons + empty/error states like `TasksView`/`QuickTaskAssign`.
    - Root `data-testid="task-post-handling-slide-page"`.

### G. Surface wiring (package) — `packages/tasks/src/surface-ids.ts`

15. Add:
    ```ts
    export const TASK_POST_HANDLING_SLIDE_SURFACE_ID = "task-post-handling-slide";
    export const TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID =
      "task-post-handling-pending-warning-sheet";

    export type TaskPostHandlingPendingWarningSheetSurfaceProps = {
      taskId: string;
      onConfirm: () => void;
    };

    export type TaskPostHandlingSurfaceOpeners = {
      closeSurface?: () => void;
      openTaskDetail?: (taskId: string) => void;
      openTaskActions?: (taskId: string, itemId: string | null) => void;
      openImageViewer?: (
        taskId: string,
        itemClientId: string | null,
        images: Array<{ client_id: string; image_url: string }>,
      ) => void;
      openPendingWarning?: (props: TaskPostHandlingPendingWarningSheetSurfaceProps) => void;
    };

    export type TaskPostHandlingSlideSurfaceProps = {
      surfaceOpeners: TaskPostHandlingSurfaceOpeners;
    };
    ```
    (The first four openers mirror `QuickTaskAssignSurfaceOpeners`; `openPendingWarning` is the new
    injected sheet opener — all optional, called with `?.()`.)

### H. Package public API — `packages/tasks/src/index.ts`

16. Export: `POST_HANDLING_STATE`, `TaskPostHandlingSchema` + `TaskPostHandling`/`PostHandlingState`
    types; `completePostHandling` + `CompletePostHandlingInput`; `useCompletePostHandling`;
    `useListPostHandlingTasksQuery`; `TASK_POST_HANDLING_SLIDE_SURFACE_ID`,
    `TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID`; `TaskPostHandlingSlideSurfaceProps`,
    `TaskPostHandlingSurfaceOpeners`, `TaskPostHandlingPendingWarningSheetSurfaceProps` types; and
    the two loaders (per §14 — never statically re-export a page component):
    ```ts
    export function loadTaskPostHandlingSlidePage() {
      return import("./pages/TaskPostHandlingSlidePage").then((m) => ({
        default: m.TaskPostHandlingSlidePage,
      }));
    }
    export function loadPostHandlingPendingWarningSheetPage() {
      return import("./pages/PostHandlingPendingWarningSheetPage").then((m) => ({
        default: m.PostHandlingPendingWarningSheetPage,
      }));
    }
    ```

### I. Managers app — surface registration

17. `apps/managers-app/.../features/tasks/surfaces.ts`:
    - Import `TASK_POST_HANDLING_SLIDE_SURFACE_ID`,
      `TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID`, `loadTaskPostHandlingSlidePage`,
      `loadPostHandlingPendingWarningSheetPage`, and the `TaskPostHandlingSlideSurfaceProps` +
      `TaskPostHandlingPendingWarningSheetSurfaceProps` types from `@beyo/tasks`.
    - `const taskPostHandlingSlide = lazyWithPreload(loadTaskPostHandlingSlidePage);`
    - `const postHandlingPendingWarningSheet = lazyWithPreload(loadPostHandlingPendingWarningSheetPage);`
    - Register `[TASK_POST_HANDLING_SLIDE_SURFACE_ID]: { surface: "slide", component: taskPostHandlingSlide.Component }`
      and `[TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID]: { surface: "sheet", component: postHandlingPendingWarningSheet.Component }`.
    - Re-export both ids + props types (matching how `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` is re-exported).

### J. Managers app — `HomeView` button

18. `apps/managers-app/.../features/home/components/HomeView.tsx`:
    - Import `NotepadText` from `lucide-react`; import `TASK_POST_HANDLING_SLIDE_SURFACE_ID` +
      `TaskPostHandlingSlideSurfaceProps` from `@/features/tasks/surfaces`.
    - Import `TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID` too.
    - Add `openPostHandlingSurface()` that calls `surface.open(TASK_POST_HANDLING_SLIDE_SURFACE_ID, { surfaceOpeners })`
      reusing the exact `surfaceOpeners` block from `openQuickAssignSurface` (closeSurface,
      openTaskDetail, openTaskActions, openImageViewer) plus
      `openPendingWarning: (props) => surface.open(TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID, props)`.
      Extract the shared openers into a local helper to avoid duplication.
    - Render a new button **below the Ordering button** with the `NotepadText` icon
      (e.g. label "Post-handling"), `data-testid="home-post-handling-box"`, styled like the
      Ordering/Select-upholstery rows.

## Risks and mitigations

- Risk: `assortment` (or `post_handling`) absent in some cached/older payloads → Zod parse throws.
  Mitigation: if backend cannot guarantee presence everywhere, use `.nullable().optional()` on the
  list schema fields; keep `.nullable()` on detail (handoff says detail "always includes"). Decide
  during implementation by inspecting a live response.
- Risk: the pending-warning sheet opens over the slide (stacked surfaces). Mitigation: it is a
  registered `sheet` surface opened via `openPendingWarning` (Contract 35 §13/§14) — the standard
  surface stack the app already supports for QuickTaskAssign's discard-changes sheet; no in-page
  Vaul nesting. The `onConfirm` closure force-completes and the sheet self-closes via
  `header?.requestClose()`.
- Risk: `post_handling_states` CSV ordering / empty value edge cases. Mitigation: controller
  guarantees ≥1 active state and joins in enum order; never sends an empty param.
- Risk: `taskKeys.list(params)` collides with the main `TasksView` list cache (same key factory).
  Mitigation: the `params` object differs (`post_handling_states` present), so keys are distinct;
  invalidating `taskKeys.lists()` on complete refreshes both surfaces intentionally.
- Risk: page appears in the main chunk (INEFFECTIVE_DYNAMIC_IMPORT). Mitigation: loader function in
  `index.ts`, never a static page re-export (§14).

## Validation plan

- `npm run typecheck`: zero TypeScript errors across the monorepo.
- `npm run test -- --grep post-handling`: unit coverage for `completePostHandling` params
  (force flag, optional `post_handling_id`) and `resolveActiveInstance`.
- `npx playwright test --grep post-handling --project=mobile`: open via `HomeView` button,
  toggle pills (≥1 enforced), search debounce, complete a `filled` task, and the pending→warning→
  force-complete path; assert the completed task leaves the list.
- `npx playwright test --grep post-handling --project=desktop`: same flow on desktop.

## Review log

- `2026-07-03` Claude: initial plan authored from `HANDOFF_TO_FRONTEND_task_post_handling_20260701`.
- `2026-07-03` David: resolved all 4 clarifications (pending+filled default; first non-completed
  instance; pending warning as an injected package sheet page; `filled` completes immediately).
- `2026-07-03` Claude: applied resolutions — added `PostHandlingPendingWarningSheetPage` (package
  sheet), `openPendingWarning` opener, warning-sheet surface id/props/loader, and app registration.

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging` (once Codex begins implementation)
- Transition owner: `David`
