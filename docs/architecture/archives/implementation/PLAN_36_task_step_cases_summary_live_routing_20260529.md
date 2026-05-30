# PLAN_36_task_step_cases_summary_live_routing_20260529

## Metadata

- Plan ID: `PLAN_36_task_step_cases_summary_live_routing_20260529`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T17:22:29Z`
- Related issue/ticket: —
- Predecessor plan: `docs/architecture/under_construction/implementation/PLAN_35_task_step_cases_summary_20260529.md` (archived)

## Goal and intent

- Goal: Fix stale-routing bug introduced by PLAN_35. The `cases_summary` embedded in the task step response goes stale after the user resolves a case — the routing button keeps opening the cases list instead of case creation. Fix by deriving routing state from live case queries in the task detail controller, and simplify `cases_summary` to only carry `total_unread` (the one value the frontend cannot cheaply derive from live queries at list time).
- Business/user intent: The routing button must always route correctly even without a page reload. Card badges are allowed to be briefly stale (they refresh with the step list). The task detail routing button must be fresh.
- Non-goals: Changing the `TaskCasesSlidePage`, `CasesViewProvider` entity-filter extension (already done in PLAN_35), or any case surface.

## Scope

- In scope:
  - Simplify `CasesSummarySchema` to `{ total_unread }` only
  - Export `useUnreadCountsQuery` from `@beyo/cases`
  - Export `CasesViewControllerParams` from `@beyo/cases` (needed by consuming code)
  - `useTaskStepDetailController` — add live case queries, derive `liveCasesSummary`, rewrite `handleOpenCasesForTask` to read from it
  - `TaskStepDetailController` type — replace `handleOpenCaseCreation` with `handleOpenCasesForTask`, expose `liveCasesSummary`
  - `TaskStepDetailProvider` — update context type to match
  - Task detail page — update cases button badge source from `casesSummary` → `liveCasesSummary.totalUnread`

- Out of scope:
  - `TaskCasesSlidePage`, `CasesViewProvider`, surface registrations — implemented in PLAN_35, no changes
  - Card badge — still reads `vm.casesSummary?.total_unread` (embedded field, stale is acceptable)
  - Realtime updates

- Assumptions:
  - PLAN_35 is fully implemented: `TaskCasesSlidePage` exists, surfaces are registered, `CasesViewProvider` accepts `entityClientId`/`entityType` props, `TaskStepSchema` has `cases_summary`.
  - Backend will simplify `cases_summary` to `{ total_unread }` (see handoff). Until that lands, the Zod schema change is safe — `.optional()` ignores unknown fields.
  - `useUpdateCaseState.onSettled` already invalidates `caseKeys.lists()` and `caseKeys.unreadCountsRoot()` — no new invalidation wiring needed.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors.
2. After resolving a case: tapping the routing button opens case creation without a page reload.
3. With one open case and one unread case: tapping the button opens that conversation directly.
4. With multiple open cases: tapping the button opens `TaskCasesSlidePage`.
5. Card badge still shows `vm.casesSummary?.total_unread` and does not crash when `null`.
6. Task detail badge shows `liveCasesSummary.totalUnread` and does not crash when queries are loading.

## Implementation plan

### Step 1 — Simplify `CasesSummarySchema`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

Replace the existing `CasesSummarySchema` (which has 4 fields) with:

```ts
export const CasesSummarySchema = z.object({
  total_unread: z.number().int(),
});
export type CasesSummary = z.infer<typeof CasesSummarySchema>;
```

No other changes in this file — `TaskStepSchema`, `TaskStepCardViewModel`, and `toTaskStepCardViewModel` remain as implemented in PLAN_35. The `casesSummary` field on the view model now has type `{ total_unread: number } | null`.

### Step 2 — Export `useUnreadCountsQuery` from `@beyo/cases`

**File:** `packages/cases/src/index.ts`

Add after the existing query hook exports:

```ts
export { useUnreadCountsQuery } from "./api/use-unread-counts";
```

The full export block (showing context around the change):

```ts
export { useGetCaseQuery } from "./api/use-get-case";
export { useCaseLinksQuery } from "./api/use-case-links";
export { useCaseParticipantsQuery } from "./api/use-case-participants";
export { useListCasesQuery } from "./api/use-list-cases";
export { useListCaseTypesQuery } from "./api/use-list-case-types";
export { useListUsersQuery } from "./api/use-list-users-query";
export { useUnreadCountsQuery } from "./api/use-unread-counts"; // ← add this line
```

### Step 3 — Export `CasesViewControllerParams` from `@beyo/cases`

**File:** `packages/cases/src/index.ts`

The existing export line for `CasesViewController` type:

```ts
export type { CasesViewController } from "./controllers/use-cases-view.controller";
```

Update to also export the params type:

```ts
export type {
  CasesViewController,
  CasesViewControllerParams,
} from "./controllers/use-cases-view.controller";
```

Note: `CasesViewControllerParams` was added to the controller in PLAN_35. If it was not exported at that time, add it now.

### Step 4 — Update `useTaskStepDetailController`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**4a. Add imports** — extend the existing `@beyo/cases` import:

```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
  type ParticipantPickerSlideSurfaceProps,
  useListCasesQuery,        // ← add
  useUnreadCountsQuery,     // ← add
} from "@beyo/cases";
```

**4b. Add live case queries** — inside `useTaskStepDetailController`, after `const { open: openSurface } = useSurface();`:

```ts
const taskCasesQuery = useListCasesQuery({
  case_state: "open,resolving",
  entity_client_id: resolvedTaskId,
  entity_type: "task",
});

const taskCaseIds = useMemo(
  () => (taskCasesQuery.data ?? []).map((c) => c.client_id),
  [taskCasesQuery.data],
);

const taskUnreadCountsQuery = useUnreadCountsQuery(
  taskCaseIds.length > 0 ? taskCaseIds : undefined,
);
```

**4c. Derive `liveCasesSummary`** — add after the queries:

```ts
const liveCasesSummary = useMemo(() => {
  const cases = taskCasesQuery.data ?? [];
  const unreadCounts = taskUnreadCountsQuery.data ?? {};
  const unreadCaseIds = taskCaseIds.filter(
    (id) => (unreadCounts[id] ?? 0) > 0,
  );
  return {
    openResolvingCount: cases.length,
    totalUnread: unreadCaseIds.reduce(
      (sum, id) => sum + (unreadCounts[id] ?? 0),
      0,
    ),
    unreadCaseCount: unreadCaseIds.length,
    singleUnreadCaseId:
      unreadCaseIds.length === 1 ? (unreadCaseIds[0] ?? null) : null,
  };
}, [taskCasesQuery.data, taskCaseIds, taskUnreadCountsQuery.data]);
```

**4d. Replace `handleOpenCaseCreation` with `handleOpenCasesForTask`** — remove the old `handleOpenCaseCreation` callback and add:

```ts
const handleOpenCasesForTask = useCallback(() => {
  if (liveCasesSummary.openResolvingCount === 0) {
    const surfaceOpeners: CaseCreationSurfaceOpeners = {
      openCaseTypePicker: (props) =>
        openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
      openParticipantPicker: (props: ParticipantPickerSlideSurfaceProps) =>
        openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
    };
    openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
      entityTypes: ["task"],
      surfaceOpeners,
    });
    return;
  }

  if (
    liveCasesSummary.unreadCaseCount === 1 &&
    liveCasesSummary.singleUnreadCaseId
  ) {
    openSurface(CASE_CONVERSATION_SURFACE_ID, {
      caseClientId: liveCasesSummary.singleUnreadCaseId,
    });
    return;
  }

  openSurface(TASK_CASES_SLIDE_SURFACE_ID, {
    taskId: resolvedTaskId,
  } as TaskCasesSlideSurfaceProps);
}, [liveCasesSummary, openSurface, resolvedTaskId]);
```

**4e. Update return object** — replace `handleOpenCaseCreation` with `handleOpenCasesForTask` and add `liveCasesSummary`:

```ts
return {
  stepId: resolvedStepId,
  taskId: resolvedTaskId,
  workingSectionId: resolvedWorkingSectionId,
  step,
  itemCategory,
  isItemCategoryPending,
  isItemCategoryError,
  isSeatCategory,
  vm,
  isPending: query.isPending,
  isError: query.isError,
  isStepTerminal: vm ? STEP_TERMINAL_STATES.has(vm.state) : false,
  casesSummary: step?.cases_summary ?? null,   // kept for card badge
  liveCasesSummary,                            // for routing button + detail badge
  handleTransition,
  handleComplete,
  handleOpenImageViewer,
  handleOpenActionsSheet,
  handleOpenCasesForTask,                      // replaces handleOpenCaseCreation
  handleOpenFlowRecord,
  isTransitioning,
  transitioningStepId: pendingStepId ?? null,
};
```

### Step 5 — Update `TaskStepDetailController` type

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

Replace the type definition. Key changes: remove `handleOpenCaseCreation`, add `handleOpenCasesForTask` and `liveCasesSummary`:

```ts
export type LiveCasesSummary = {
  openResolvingCount: number;
  totalUnread: number;
  unreadCaseCount: number;
  singleUnreadCaseId: string | null;
};

export type TaskStepDetailController = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  step: TaskStep | null;
  itemCategory: ItemCategoryViewModel | null;
  isItemCategoryPending: boolean;
  isItemCategoryError: boolean;
  isSeatCategory: boolean;
  vm: TaskStepCardViewModel | null;
  isPending: boolean;
  isError: boolean;
  isStepTerminal: boolean;
  casesSummary: CasesSummary | null;
  liveCasesSummary: LiveCasesSummary;
  handleTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
  handleComplete: () => void;
  handleOpenImageViewer: (initialImageClientId: string) => void;
  handleOpenActionsSheet: () => void;
  handleOpenCasesForTask: () => void;
  handleOpenFlowRecord: (entityClientId: string) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
};
```

Add the `CasesSummary` import from the local types file:

```ts
import type { CasesSummary, LiveCasesSummary, ... } from "../types";
```

Or define `LiveCasesSummary` inline — place it just above the `TaskStepDetailController` type in the controller file.

### Step 6 — Update `TaskStepDetailProvider`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/providers/TaskStepDetailProvider.tsx`

The provider mirrors the controller type. After step 5, TypeScript will flag `handleOpenCaseCreation` as unknown and `liveCasesSummary` as missing. Update the context type to match `TaskStepDetailController` exactly — no logic changes required.

### Step 7 — Update cases button badge in task detail page

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

The cases button was added in PLAN_35 using `controller.casesSummary?.total_unread`. Update to use `liveCasesSummary.totalUnread`:

Before:
```tsx
{(controller.casesSummary?.total_unread ?? 0) > 0 ? (
  <span ...>{controller.casesSummary!.total_unread}</span>
) : null}
```

After:
```tsx
{controller.liveCasesSummary.totalUnread > 0 ? (
  <span
    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
    data-testid="task-step-cases-unread-badge"
  >
    {controller.liveCasesSummary.totalUnread}
  </span>
) : null}
```

Also update the `onClick` handler if it was still wired to `handleOpenCaseCreation`:

```tsx
onClick={controller.handleOpenCasesForTask}
```

## Risks and mitigations

- Risk: `taskCasesQuery` fires an extra request on task detail open before the user has visited `TaskCasesSlidePage` — cost is one small list fetch (task has 0–10 cases typically).
  Mitigation: acceptable; query is light and warm-cached once `TaskCasesSlidePage` has been visited in the session.

- Risk: `useUnreadCountsQuery` called with empty or undefined `taskCaseIds` when there are no open cases — the hook already guards with `enabled: normalizedIds === undefined || normalizedIds.length > 0`, so it skips the fetch correctly.
  Mitigation: pass `taskCaseIds.length > 0 ? taskCaseIds : undefined` as shown in step 4b.

- Risk: Backend has not yet simplified `cases_summary` to `{ total_unread }` when this plan runs — the simplified `CasesSummarySchema` uses `.optional()` on the parent field, so extra fields returned by the backend are ignored by Zod (strip mode).
  Mitigation: no action required; changes are safe to ship before the backend update.

## Validation plan

- `npm run typecheck`: zero errors in `packages/cases`, `apps/workers-app`
- Manual: task with 1 open case → resolve case in cases view → close cases view → tap button → case creation opens (no reload needed)
- Manual: task with 0 cases → tap button → case creation opens
- Manual: task with 1 open case, 1 unread → tap button → conversation opens
- Manual: task with 2+ open cases → tap button → task cases list opens
- Manual: card badge shows count when `vm.casesSummary?.total_unread > 0`, absent when `null`

## Review log

- `2026-05-29` `claude-sonnet-4-6`: Initial plan authored
- `2026-05-29` `github-copilot`: Implemented live-routing logic from queries, updated exports, and archived plan artifacts.

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `github-copilot`
