# PLAN_task_post_handling_page_corrections_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_page_corrections_20260703`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T09:16:48Z`
- Related issue/ticket: `review of PLAN_task_post_handling_page_20260703`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_task_post_handling_page_20260703.md`
- Source (implemented) plan: `docs/architecture/archives/implementation/PLAN_task_post_handling_page_20260703.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_task_post_handling_page_20260703.md`

## Goal and intent

- Goal: Post-implementation corrections **and** improvements to the task post-handling worklist,
  authored as a **staged** plan:
  - **Stage 1** — fix the two review findings (error handling, styling drift).
  - **Stage 2** — pending-reason validator utility (domain) + show missing fields on the warning sheet.
  - **Stage 3** — Home button post-handling count badge (`pending + filled`) via the new counts
    endpoint, and post-handling mutations invalidate that counts query.
  - **Stage 4** — socket `task:updated` invalidates the post-handling counts (and list) queries.
  - **Stage 5** — absolute scroll-reactive footer with a "Close & Back" button; remove the header
    back arrow.
- Business/user intent: failures are visible; users understand *why* a task is still pending before
  overriding; managers see an at-a-glance actionable count; the worklist stays live via sockets; and
  the page's close affordance matches the QuickTaskAssign slide.
- Non-goals: no post-handling *edit* UI (`PATCH /tasks/{id}/post-handling`) — that action does not
  exist yet; this plan only ensures the counts query is invalidated by the post-handling mutations we
  do own (and notes the future PATCH action must do the same). No Playwright authoring (tracked
  separately). No backend changes.

## Scope

- In scope: see the 5 stages above.
- Out of scope: assortment editing/rendering on cards, the general task-edit flow, workers/sellers
  apps.
- Assumptions:
  - `notify` is available from `@beyo/lib` (`notify.success/error/info`, backed by `sonner`).
  - `@beyo/lib` is already a peer dependency of `@beyo/tasks` (used throughout the package).
  - `TaskListItemRaw.task` already carries `task_type`, `fulfillment_method`, `scheduled_start_at`,
    `scheduled_end_at`, and `assortment` — so the warning sheet's missing-field list can be computed
    from the list item already in hand (no extra `getTask` fetch needed).
  - The managers `task:updated` socket handler already invalidates `taskKeys.lists()`, which covers
    the post-handling **list** query (it shares the package `taskKeys.list` factory); only the new
    **counts** key needs adding.
  - Backend: completion emits `task_post_handling:completed` (not a typed client event); PATCH
    routes emit `task:updated`. Therefore the complete action must invalidate counts itself (Stage 3)
    — the socket alone (Stage 4) does not cover completion.

## Clarifications required — RESOLVED 2026-07-03

- [x] **(Stage 1) Success toast on completion** → NOT needed. The list + counts updating is sufficient
  confirmation. **Error-only** toast. Additionally: when completing the last remaining
  non-completed post-handling task on the list, the page **auto-closes** on that action.
- [x] **(Stage 1) Error copy** → default: `notify.error("Couldn't complete post-handling", <server message>)`,
  surfacing the flat backend message (per `04_api_client_local.md`) as the description.
- [x] **(Stage 2) Missing-field labels** → default: pre_order → "Fulfillment method",
  "Delivery date (start or end)"; return → "Assortment".
- [x] **(Stage 3) Count badge states** → default: `post_handling_states=pending,filled` summed into a
  single number rendered like the Ordering badge.

## Acceptance criteria

### Stage 1

1. Completing a `filled` task that the backend rejects (400/404) shows an error toast; no unhandled
   promise rejection appears in the console.
2. The pending → warning → force-complete path shows an error toast on failure; on success there is
   **no success toast** (the list/counts refresh is the confirmation). The sheet still closes.
3. `handleComplete` never leaks a rejected promise to `void` callers — it resolves in all cases.
3a. When a completion succeeds and no non-completed post-handling task remains on the loaded list,
    the surface auto-closes (`surfaceOpeners.closeSurface?.()`).
4. Filter pills (active and inactive) render using semantic design tokens only; no raw Tailwind
   palette classes (`blue-*`, `slate-*`) remain in `TaskPostHandlingHeader.tsx`.
5. `npm run typecheck` clean.

### Stage 2

6. A pure `@beyo/tasks` utility returns the unmet post-handling requirements for a given task,
   replicating the handoff's PENDING→FILLED rules (pre_order: `fulfillment_method` + at least one of
   `scheduled_start_at`/`scheduled_end_at`; return: `assortment`; other task types: none).
7. The pending warning sheet lists those missing fields (task-type aware) above the confirm button.

### Stage 3

8. `GET /api/v1/tasks/post-handling/counts?post_handling_states=pending,filled` is consumed by a
   package query hook; the Home "Post-handling" button shows `Post-handling (N)` where `N` = pending
   + filled, mirroring the Ordering badge (label hidden/blank while loading).
8a. The Home "Post-handling" button uses the custom `PostHandlingIcon.svg` asset (via `?react`),
    not lucide `NotepadText`.
9. `useCompletePostHandling` invalidates the post-handling counts query key on settle (in addition to
   `taskKeys.detail`/`lists`).

### Stage 4

10. The managers `task:updated` socket handler invalidates the post-handling counts query key. (The
    post-handling **list** query is already covered by the existing `taskKeys.lists()` invalidation;
    confirm and leave as-is — do not duplicate.)

### Stage 5

11. `TaskPostHandlingSlidePage` renders an absolute footer holding a "Close & Back" button styled like
    the `QuickTaskAssignSlidePage` footer, reacting to the same body scroll via the same `useScrollHide`
    controller/`--scroll-hide-progress` variable as the header.
12. The header no longer renders a back arrow; the search bar spans the freed width. The footer button
    is the sole close affordance. Body bottom padding clears the footer.
13. `npm run typecheck` clean for all stages.

## Contracts and skills

### Contracts loaded

- `architecture/13_errors.md`: error surfacing for the mutation/action path (Stage 1).
- `architecture/08_hooks.md`: action-hook responsibilities — invalidation vs. notify (Stages 1, 3).
- `architecture/04_api_client.md` + `_local`: flat-string backend error shape (Stage 1); `apiClient.get`
  for the counts endpoint (Stage 3).
- `architecture/14_styling.md`: semantic design-token usage; no raw palette (Stage 1, Stage 5 footer).
- `architecture/20_notifications.md`: `notify` usage (else `@beyo/lib` `notify`) (Stage 1).
- `architecture/02_types.md`: pure typed utility + Zod schema for the counts response (Stages 2, 3).
- `architecture/05_server_state.md`: counts query hook + query-key factory (Stage 3).
- `architecture/21_realtime.md`: socket handler invalidation pattern (Stage 4).
- `architecture/36_scroll_visibility.md`: reuse `useScrollHide` / `--scroll-hide-progress` for the
  scroll-reactive footer (Stage 5).

### File read intent — pattern vs. relational

Relational reads only (what exists — already performed):
`packages/tasks/src/controllers/use-task-post-handling.controller.ts`,
`packages/tasks/src/actions/use-complete-post-handling.ts`,
`packages/tasks/src/pages/{TaskPostHandlingSlidePage,PostHandlingPendingWarningSheetPage}.tsx`,
`packages/tasks/src/components/{TaskPostHandlingHeader,PostHandlingBottomAction}.tsx`,
`packages/tasks/src/api/task-keys.ts`, `packages/tasks/src/types.ts`,
`packages/lib/src/notify.ts`,
`packages/task-working-sections/src/api/{get-task-counts,use-task-counts-query,quick-task-keys}.ts`
(counts endpoint + key pattern reference),
`apps/managers-app/.../features/tasks/socket-events.ts`,
`apps/managers-app/.../features/home/components/HomeView.tsx`,
`packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` (footer styling reference),
`docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_post_handling_20260701.md` (counts + PENDING→FILLED rules).
No pattern reads required — contracts cover query-hook / action-hook / socket structure.

### Skill selection

- Primary skill: none. Codex executes against contracts.

## Implementation plan

### Stage 1 — Fix #1 (error handling) and #2 (styling)

#### 1. Error handling for completion (finding #1)

Decide the single owner of user feedback. Recommended: keep invalidation in the mutation hook and
put user-facing feedback in the controller's `handleComplete` (it already owns the try/finally and
the `completingTaskId` state), so both call sites (card `onComplete` and warning-sheet `onConfirm`)
are covered by one change.

1a. `packages/tasks/src/controllers/use-task-post-handling.controller.ts` — wrap the await in a
    `try/catch/finally`, never rethrow, **error-only** toast, and auto-close when the last actionable
    task is completed:
    ```ts
    async function handleComplete(
      taskId: string,
      instance: TaskPostHandling | null,
      force: boolean,
    ): Promise<void> {
      if (!instance) {
        return;
      }

      setCompletingTaskId(taskId);
      try {
        await completeMutation.completePostHandling({
          taskId,
          post_handling_id: instance.client_id,
          force,
        });
        // No success toast — the list/counts refresh is the confirmation.
        // Auto-close when nothing actionable remains on the loaded list.
        const remainingActionable = tasks.filter(
          (t) =>
            t.task.client_id !== taskId &&
            resolveActiveInstance(t.task.post_handling) != null,
        ).length;
        if (remainingActionable === 0) {
          surfaceOpeners?.closeSurface?.();
        }
      } catch (error) {
        notify.error(
          "Couldn't complete post-handling",
          error instanceof Error ? error.message : undefined,
        );
      } finally {
        setCompletingTaskId((current) => (current === taskId ? null : current));
      }
    }
    ```
    - Import `notify` from `@beyo/lib`.
    - Because `handleComplete` now resolves in all cases, the existing `void controller.handleComplete(...)`
      and `void onConfirm?.()` call sites no longer risk unhandled rejections — leave them as-is.
    - Auto-close uses the loaded `tasks` (the just-completed row is excluded by id; other rows count as
      actionable only if `resolveActiveInstance(...) != null`, so completed rows shown under an active
      "completed" filter do not keep the page open). See Risks for the pagination edge.

1b. Confirm `useCompletePostHandling` stays invalidation-only (no `onError` needed there now that the
    controller owns feedback). No change unless the owner prefers feedback in the hook; if so, move
    the `notify` calls into `onError`/`onSettled` and drop them from the controller — but do not
    duplicate in both places.

1c. Warning sheet (`PostHandlingPendingWarningSheetPage.tsx`) — no change required; `onConfirm`
    already resolves cleanly once `handleComplete` swallows its own errors. The sheet closes
    immediately via `header?.requestClose()`, which is acceptable (feedback arrives as a toast).

#### 2. Design-token styling for filter pills (finding #2)

2a. `packages/tasks/src/components/TaskPostHandlingHeader.tsx` — replace the raw palette classes on
    the pill button (currently `border-blue-400 bg-blue-100 text-blue-700` /
    `border-slate-300 bg-card text-slate-700`) with semantic tokens consistent with the rest of the
    feature. Suggested mapping (match the codebase's existing selected/unselected affordances, e.g.
    `StatePill` / `BoxSlidePicker`):
    - Active: `border-primary bg-primary/10 text-primary` (or `bg-primary text-card` for a filled
      look — pick the one that matches the app's other multi-select pills).
    - Inactive: `border-border bg-card text-muted-foreground`.
    - Keep `capitalize`, sizing, and `transition` as-is.
2b. Optional (a11y, low cost while here): add `aria-pressed={isActive}` to each pill button.

### Stage 2 — Pending-reason validator + warning-sheet display

3. NEW `packages/tasks/src/lib/post-handling-requirements.ts` — pure domain utility replicating the
   handoff's PENDING→FILLED rules (§"PENDING → FILLED transition rules"):
   ```ts
   export type PostHandlingRequirementKey =
     | "fulfillment_method"
     | "schedule"
     | "assortment";

   export type PostHandlingRequirement = {
     key: PostHandlingRequirementKey;
     label: string;
   };

   type PostHandlingTaskFields = Pick<
     TaskListItemRaw["task"],
     | "task_type"
     | "fulfillment_method"
     | "scheduled_start_at"
     | "scheduled_end_at"
     | "assortment"
   >;

   // Returns the requirements NOT yet satisfied (empty = would be `filled`).
   export function getPostHandlingMissingRequirements(
     task: PostHandlingTaskFields,
   ): PostHandlingRequirement[];
   ```
   Rules (treat empty string as missing, mirror backend):
   - `pre_order`: require `fulfillment_method` (non-null, non-empty) → else push `fulfillment_method`;
     require `scheduled_start_at || scheduled_end_at` → else push `schedule`.
   - `return`: require `assortment` (non-null, non-empty) → else push `assortment`.
   - any other `task_type`: return `[]` (no post-handling record).
   Labels per the Stage-2 clarification. Export the function + types from `index.ts`.
4. `packages/tasks/src/surface-ids.ts` — extend the warning props so the sheet can render reasons:
   ```ts
   export type TaskPostHandlingPendingWarningSheetSurfaceProps = {
     taskId: string;
     missingRequirements: PostHandlingRequirement[];
     onConfirm?: () => void | Promise<void>;
   };
   ```
   (Reinstates `taskId` dropped in the first implementation, and adds the reasons list.)
5. `packages/tasks/src/controllers/use-task-post-handling.controller.ts` — change `openPendingWarning`
   to take the full list item (it already has the fields), compute requirements, and pass them:
   ```ts
   function openPendingWarning(task: TaskListItemRaw, instance: TaskPostHandling | null): void {
     surfaceOpeners?.openPendingWarning?.({
       taskId: task.task.client_id,
       missingRequirements: getPostHandlingMissingRequirements(task.task),
       onConfirm: () => handleComplete(task.task.client_id, instance, true),
     });
   }
   ```
6. `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` — update the card's
   `onRequestPendingWarning` to call `controller.openPendingWarning(task, activeInstance)` (pass the
   whole list item, not just the id).
7. `packages/tasks/src/pages/PostHandlingPendingWarningSheetPage.tsx` — read `missingRequirements`
   from props and render them as a labelled checklist (e.g. "Still needed to reach *filled*:" + a
   list) above the confirm button. If `missingRequirements` is empty (edge/stale), render a generic
   line and still allow force-complete.

### Stage 3 — Home post-handling count badge

8. NEW `packages/tasks/src/api/get-post-handling-counts.ts` — `apiClient.get` on
   `/api/v1/tasks/post-handling/counts` with optional `post_handling_states` CSV. Response is a flat
   per-state object (states with zero are `0`; only requested states are present when filtered):
   ```ts
   const PostHandlingCountsSchema = ApiEnvelopeSchema(
     z.object({
       pending: z.number().int().optional(),
       filled: z.number().int().optional(),
       completed: z.number().int().optional(),
     }),
   ).extend({ ok: z.literal(true) });
   export type PostHandlingCounts = z.infer<typeof PostHandlingCountsSchema>["data"];
   export async function getPostHandlingCounts(params: { post_handling_states?: string }): Promise<PostHandlingCounts>;
   ```
   NOTE: this endpoint's shape is flat `{pending,filled,completed}` — **not** the `{total,granularity}`
   shape of `/tasks/counts`. Do not reuse `getTaskCounts`.
9. `packages/tasks/src/api/task-keys.ts` — add a key:
   ```ts
   postHandlingCounts: (states: string) =>
     [...taskKeys.all, "post-handling", "counts", states] as const,
   ```
10. NEW `packages/tasks/src/api/use-post-handling-counts-query.ts` — `useQuery` keyed by
    `taskKeys.postHandlingCounts(states)` calling `getPostHandlingCounts({ post_handling_states: states })`.
    Export the hook + `getPostHandlingCounts` + `PostHandlingCounts` from `index.ts`.
11. `packages/tasks/src/actions/use-complete-post-handling.ts` — in `onSettled`, also invalidate
    `taskKeys.postHandlingCounts` for all states (use a prefix: `[...taskKeys.all, "post-handling", "counts"]`
    or invalidate by the `postHandlingCounts` partial key) so completion updates the badge. (Forward
    note: a future `PATCH /tasks/{id}/post-handling` action must invalidate the same key.)
12. `apps/managers-app/.../features/home/components/HomeView.tsx` — add
    `const postHandlingCountsQuery = usePostHandlingCountsQuery("pending,filled");`, compute
    `const postHandlingCount = (data?.pending ?? 0) + (data?.filled ?? 0)`, and render
    `Post-handling{postHandlingCountLabel}` exactly like `Ordering{orderingCountLabel}`
    (blank while `data` is undefined).
12a. Swap the Post-handling button icon from lucide `NotepadText` to the custom asset:
     `import PostHandlingIcon from "@/assets/icons/PostHandlingIcon.svg?react";` (same `?react`
     pattern as `ThreadIcon`/`ClipboardIcon`), render `<PostHandlingIcon aria-hidden="true"
     className="size-8 shrink-0" />` in the button, and drop `NotepadText` from the `lucide-react`
     import (no longer used in this file — the package's `PostHandlingBottomAction` keeps its own
     `NotepadText` import).

### Stage 4 — Socket invalidation

13. `apps/managers-app/.../features/tasks/socket-events.ts` — in the `task:updated` handler, add:
    ```ts
    queryClient.invalidateQueries({
      queryKey: [...taskKeys.all, "post-handling", "counts"],
      refetchType: "active",
    });
    ```
    The post-handling **list** query is already invalidated by the existing `taskKeys.lists()` call in
    the same handler (shared `taskKeys.list` factory) — verify and do not add a duplicate. Consider the
    same counts invalidation in `task:created`/`task:deleted`/`task:state-changed` if the badge should
    also react to those (optional — confirm scope; `task:updated` is the intention's explicit ask).

### Stage 5 — Absolute scroll-reactive footer + remove header back arrow

14. `packages/tasks/src/components/TaskPostHandlingHeader.tsx` — remove the `ChevronLeft` back button
    and the `onBack` prop; let the `SearchBar` occupy the full row width. Keep the scroll-reactive
    filter-pill row unchanged (already token-based after Stage 1).
15. NEW `packages/tasks/src/components/TaskPostHandlingFooter.tsx` (or inline in the page) — an absolute
    footer mirroring `QuickTaskUnifiedFooter`'s container + "Close & Back" button styling
    (`bg-background shadow-[0_-1px_0_0_var(--color-border)]`; button
    `rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm`;
    plus the `h-(--safe-bottom,0px)` spacer). Single "Close & Back" button; `data-testid`
    `task-post-handling-close-button`.
16. `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`:
    - Render the footer inside the same `hideProgressContainerRef` subtree so `--scroll-hide-progress`
      cascades. Position it `absolute inset-x-0 bottom-0 z-10` and apply a downward reaction:
      `transform: translateY(calc(100% * var(--scroll-hide-progress, 0)))` +
      `opacity: calc(1 - var(--scroll-hide-progress, 0))` +
      `transition: ... var(--scroll-snap-duration, 0ms) ease-out` +
      `pointerEvents: isHidden ? "none" : undefined` (same variables the header row uses).
    - Wire the button to `controller.closeSurface ?? (() => header?.requestClose())` (the logic
      currently on the header's `onBack`).
    - Remove `onBack` from the `<TaskPostHandlingHeader>` usage.
    - Increase the scroll body's bottom padding so content clears the footer height
      (footer button ≈ 3.5rem + safe-bottom; ensure `pb` ≥ that, e.g. keep/raise the current
      `pb-[calc(var(--safe-bottom,0)+5.5rem)]`).

## Risks and mitigations

- Risk: putting `notify` in both the hook and the controller → double toasts. Mitigation: single
  owner — controller only (per 1b).
- Risk: surfacing the raw backend string could leak an unfriendly message. Mitigation: gated by the
  clarification; default to a fixed error title with the server message as the optional description.
- Risk: chosen token mapping doesn't visually match sibling pills. Mitigation: mirror an existing
  multi-select pill component in the app rather than inventing a new active style.
- Risk (Stage 1 auto-close): the loaded list may be one page of many (`hasNextPage`), so
  "remainingActionable === 0" could be true while more actionable tasks exist on unfetched pages,
  closing the page prematurely. Mitigation: acceptable for the common single-page case; if it proves
  annoying, guard with `&& !query.hasNextPage` (only auto-close when the full list is loaded). Do not
  block the close on an in-flight refetch — compute from the pre-refetch `tasks` synchronously.
- Risk (Stage 2): validator drifts from backend rules over time. Mitigation: keep it a single pure
  function with the handoff section cited in a comment; treat empty string as missing exactly as the
  backend does. Note: the validator is a client-side hint only — the backend remains the source of
  truth (the override still force-completes regardless).
- Risk (Stage 3): counts key invalidated by prefix must actually match the query key. Mitigation: use
  the exact prefix `[...taskKeys.all, "post-handling", "counts"]` that `postHandlingCounts(states)`
  extends, so partial-match invalidation covers every state variant.
- Risk (Stage 3): counts response omits unrequested states → `undefined`. Mitigation: schema marks
  each state optional; the Home sum uses `?? 0`.
- Risk (Stage 4): double-invalidation churn if both the list and counts are broadly invalidated on
  every task update. Mitigation: reuse the existing `taskKeys.lists()` call (already present) and add
  only the counts prefix; keep `refetchType: "active"`.
- Risk (Stage 5): footer overlaps the last card or the pull-to-refresh math. Mitigation: footer is
  absolute (out of scroll flow); add body bottom padding to clear it; reuse the header's proven
  `--scroll-hide-progress` variable so header and footer react in lockstep.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (all stages).
- Stage 1: force a 400 from the complete endpoint → error toast, no console unhandled rejection;
  success path → row leaves the list (+ success toast if confirmed). No `blue-*`/`slate-*` remain
  (`grep -n "blue-\|slate-" packages/tasks/src/components/TaskPostHandlingHeader.tsx` → empty).
- Stage 2: unit-test `getPostHandlingMissingRequirements` across pre_order (none/partial/full),
  return (missing/has assortment), and a non-post-handling task_type; open the warning on a pending
  card and verify the correct fields are listed.
- Stage 3: badge shows `pending + filled`; completing a task decrements it (counts query invalidated
  by the complete action).
- Stage 4: emit a `task:updated` (e.g. edit a task elsewhere) → the badge and the open worklist
  refetch without a manual refresh.
- Stage 5: footer "Close & Back" closes the slide; footer hides/reveals in lockstep with the header
  on scroll; header has no back arrow; no content is occluded by the footer.

## Review log

- `2026-07-03` Claude: Stage 1 authored from the post-implementation review (findings #1 error
  handling, #2 styling drift).
- `2026-07-03` David: added intention for Stages 2–5 (pending-reason validator, Home count badge,
  socket invalidation, scroll-reactive footer).
- `2026-07-03` Claude: authored Stages 2–5 from the updated handoff (counts endpoint + PENDING→FILLED
  rules) and the QuickTaskAssign footer reference.
- `2026-07-03` David: resolved all 4 clarifications — error-only toast (no success toast; add
  auto-close when the last actionable task is completed); rest approved with defaults.
- `2026-07-03` Claude: applied resolutions (Stage 1 error-only + auto-close); plan approved.

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging` (once Codex begins implementation)
- Transition owner: `David`
