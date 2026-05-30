# PLAN_35_task_step_cases_summary_20260529

## Metadata

- Plan ID: `PLAN_35_task_step_cases_summary_20260529`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T16:51:39Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Embed a `cases_summary` aggregate on each task step response and wire it into the workers-app task step UI, enabling a smart "cases" entry point that conditionally routes to creation, the conversation, or the full cases list — and renders an unread notification badge on both the task card and the task detail page.
- Business/user intent: Workers should see at a glance whether a task has open cases and how many unread messages are waiting. Tapping a single button should take them exactly where they need to go without extra navigation steps.
- Non-goals: Creating a new backend query layer in the frontend; modifying the case conversation or case creation surfaces themselves; cross-app support (this plan is workers-app only).

## Scope

- In scope:
  - `TaskStepSchema` Zod extension with `cases_summary` field
  - `TaskStepCardViewModel` + `toTaskStepCardViewModel` update
  - `useCasesViewController` — accept optional entity filter params
  - `CasesViewProvider` — forward entity filter params to controller
  - New `TASK_CASES_SLIDE_SURFACE_ID` surface constant + props type
  - New `TaskCasesSlidePage.tsx` page (workers app)
  - Register `TASK_CASES_SLIDE_SURFACE_ID` in workers app `caseSurfaces`
  - `useTaskStepDetailController` — replace `handleOpenCaseCreation` with `handleOpenCasesForTask` + expose `casesSummary`
  - `TaskStepDetailController` type update
  - `TaskStepDetailProvider` context type update (mirrors controller)
  - Task detail page — cases button with notification pill in footer
  - Task card component — unread notification badge using `vm.casesSummary`

- Out of scope:
  - Backend implementation (see handoff document)
  - Managers app
  - Case conversation or creation surface changes
  - Realtime/websocket update of `cases_summary` (future work)

- Assumptions:
  - Backend already returns `cases_summary` on every object in the `items` array of the task steps list response.
  - `cases_summary` is `null` (not missing) when a task has zero linked cases.
  - `single_unread_case_id` is `null` unless `unread_case_count === 1`.
  - `open_resolving_count` counts only cases with state `open` or `resolving`.
  - The `CasesView` + `CasesViewProvider` pair lives in `@beyo/cases` and is already exported.

## Clarifications required

- None — backend contract is agreed upon (see handoff). Proceed once backend returns `cases_summary`.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors across all workspaces after all changes.
2. With `cases_summary: null` or `open_resolving_count === 0` — tapping the cases button opens case creation.
3. With `unread_case_count === 1` and a valid `single_unread_case_id` — tapping the button opens the conversation surface for that case.
4. With `open_resolving_count > 0` and any other unread configuration — tapping the button opens `TaskCasesSlidePage` filtered to that task's cases.
5. `TaskCasesSlidePage` shows only cases linked to the task (`entity_client_id = taskId`, `entity_type = "task"`).
6. The unread notification badge renders on the cases button in the task detail footer when `casesSummary.totalUnread > 0`.
7. The unread notification badge renders on each task card when `vm.casesSummary?.totalUnread > 0`.
8. When `casesSummary` is `null`, no badge renders and no UI element crashes.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query hook setup and query key structure
- `architecture/08_hooks.md`: Controller / aggregation hook pattern
- `architecture/23_providers.md`: Context provider shell pattern

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what exists):
- `apps/workers-app/.../features/task_steps/types.ts` — exact Zod schema and view model shape
- `apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts` — existing handleOpenCaseCreation logic
- `apps/workers-app/.../pages/task_steps/TaskDetailSlidePage.tsx` — footer layout for button placement
- `packages/cases/src/controllers/use-cases-view.controller.ts` — current query call signature
- `packages/cases/src/providers/CasesViewProvider.tsx` — current Props type
- `packages/cases/src/types.ts` — `ListCasesParams` field names
- `apps/workers-app/.../features/cases/surfaces.ts` — existing registration pattern

Prohibited:
- Reading another controller to pattern-match aggregation shape → use `08_hooks.md`
- Reading another provider to pattern-match context shell → use `23_providers.md`

### Skill selection

- Primary skill: `skills/codex/SKILL.md` — multi-file implementation
- Trigger terms: schema extension, controller routing, surface registration

## Implementation plan

### Step 1 — Add `CasesSummarySchema` to task step types

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

Add before `TaskStepSchema`:

```ts
export const CasesSummarySchema = z.object({
  open_resolving_count: z.number().int(),
  total_unread: z.number().int(),
  unread_case_count: z.number().int(),
  single_unread_case_id: z.string().nullable(),
});
export type CasesSummary = z.infer<typeof CasesSummarySchema>;
```

Add to `TaskStepSchema` (after `item_images`):

```ts
cases_summary: CasesSummarySchema.nullable().optional(),
```

### Step 2 — Add `casesSummary` to `TaskStepCardViewModel`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

Add to the `TaskStepCardViewModel` type (at the end, before closing brace):

```ts
casesSummary: CasesSummary | null;
```

### Step 3 — Update `toTaskStepCardViewModel`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

Add to the return object inside `toTaskStepCardViewModel`:

```ts
casesSummary: step.cases_summary ?? null,
```

### Step 4 — Extend `useCasesViewController` to accept entity filter params

**File:** `packages/cases/src/controllers/use-cases-view.controller.ts`

Add type (before the function):

```ts
export type CasesViewControllerParams = {
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
};
```

Import `CASE_LINK_ENTITY_TYPE` at the top (it's already in `types.ts`, add to existing import):

```ts
import {
  CASE_LINK_ENTITY_TYPE,
  getCaseTypeName,
  toCaseListCardViewModel,
  type CaseListCardViewModel,
} from "../types";
```

Change function signature:

```ts
export function useCasesViewController(
  params: CasesViewControllerParams = {},
): CasesViewController {
```

Change the query call:

```ts
const listQuery = useListCasesQuery({
  case_state: "open,resolving",
  ...(params.entityClientId ? { entity_client_id: params.entityClientId } : {}),
  ...(params.entityType ? { entity_type: params.entityType } : {}),
});
```

### Step 5 — Extend `CasesViewProvider` props

**File:** `packages/cases/src/providers/CasesViewProvider.tsx`

Update Props type and function signature:

```ts
import type { CASE_LINK_ENTITY_TYPE } from "../types";

type Props = {
  children: ReactNode;
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
};

export function CasesViewProvider({
  children,
  entityClientId,
  entityType,
}: Props): React.JSX.Element {
  const controller = useCasesViewController({ entityClientId, entityType });
  return (
    <CasesViewContext.Provider value={controller}>
      {children}
    </CasesViewContext.Provider>
  );
}
```

Note: `CASE_LINK_ENTITY_TYPE` is a `const` array — use `typeof CASE_LINK_ENTITY_TYPE` to derive the union. The import needs to include it explicitly or use the Zod-inferred type `CaseLinkEntityType` if already exported.

### Step 6 — Add `TASK_CASES_SLIDE_SURFACE_ID` to workers app surface-ids

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`

Add:

```ts
import type { TaskId } from "@beyo/lib";

export const TASK_CASES_SLIDE_SURFACE_ID = "task-cases-slide";

export type TaskCasesSlideSurfaceProps = {
  taskId: TaskId;
};
```

(Alongside the existing `TASK_STEP_ACTIONS_SHEET_SURFACE_ID` and related types.)

### Step 7 — Create `TaskCasesSlidePage.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskCasesSlidePage.tsx`

```tsx
import { useSurfaceProps } from "@beyo/hooks";
import { CasesView, CasesViewProvider } from "@beyo/cases";
import type { TaskId } from "@beyo/lib";

import type { TaskCasesSlideSurfaceProps } from "@/features/task_steps/surface-ids";

export function TaskCasesSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskCasesSlideSurfaceProps>();
  const resolvedTaskId = taskId ?? ("" as TaskId);

  return (
    <CasesViewProvider entityClientId={resolvedTaskId} entityType="task">
      <CasesView />
    </CasesViewProvider>
  );
}
```

### Step 8 — Register `TASK_CASES_SLIDE_SURFACE_ID` in workers app case surfaces

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`

Add loader:

```ts
function loadTaskCasesSlidePage() {
  return import("@/pages/task_steps/TaskCasesSlidePage").then((module) => ({
    default: module.TaskCasesSlidePage,
  }));
}
```

Add lazy component:

```ts
const taskCasesSlide = lazyWithPreload(loadTaskCasesSlidePage);
export const preloadTaskCasesSlideSurface = taskCasesSlide.preload;
```

Add import of surface ID:

```ts
import { TASK_CASES_SLIDE_SURFACE_ID } from "@/features/task_steps/surface-ids";
```

Add to `caseSurfaces`:

```ts
[TASK_CASES_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: taskCasesSlide.Component,
},
```

### Step 9 — Update `useTaskStepDetailController`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**9a.** Add imports:

```ts
import {
  TASK_CASES_SLIDE_SURFACE_ID,
  type TaskCasesSlideSurfaceProps,
} from "../surface-ids";
import type { CasesSummary } from "../types";
```

Also add `CASE_CONVERSATION_SURFACE_ID` to the existing `@beyo/cases` import:

```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
  type ParticipantPickerSlideSurfaceProps,
} from "@beyo/cases";
```

**9b.** Update `TaskStepDetailController` type — replace `handleOpenCaseCreation` with `handleOpenCasesForTask` and add `casesSummary`:

```ts
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

**9c.** Replace `handleOpenCaseCreation` with `handleOpenCasesForTask`:

```ts
const handleOpenCasesForTask = useCallback(() => {
  const summary = step?.cases_summary ?? null;

  if (!summary || summary.open_resolving_count === 0) {
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

  if (summary.unread_case_count === 1 && summary.single_unread_case_id) {
    openSurface(CASE_CONVERSATION_SURFACE_ID, {
      caseClientId: summary.single_unread_case_id,
    });
    return;
  }

  openSurface(TASK_CASES_SLIDE_SURFACE_ID, {
    taskId: resolvedTaskId,
  } as TaskCasesSlideSurfaceProps);
}, [step, openSurface, resolvedTaskId]);
```

**9d.** Update return object — replace `handleOpenCaseCreation` with `handleOpenCasesForTask`, add `casesSummary`:

```ts
return {
  // ...existing fields...
  casesSummary: step?.cases_summary ?? null,
  handleOpenCasesForTask,
  // remove handleOpenCaseCreation
};
```

### Step 10 — Update `TaskStepDetailProvider` context type

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/providers/TaskStepDetailProvider.tsx`

The provider mirrors `TaskStepDetailController`. After step 9, TypeScript will flag any missing fields. Update the context type to include `casesSummary` and `handleOpenCasesForTask`, removing `handleOpenCaseCreation`.

No logic changes required — the provider just exposes the controller through context.

### Step 11 — Cases button with notification pill in task detail page

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

Add a cases button in the footer, stacked above or beside the "Complete task" button. The button shows an unread badge when `controller.casesSummary?.totalUnread > 0`.

Note: `totalUnread` is derived from `casesSummary.total_unread`. Since `vm.casesSummary` uses the view model shape, access it via `controller.casesSummary?.total_unread`.

Button and badge pattern (positioned relative to the button):

```tsx
{/* Cases entry point button */}
<div className="relative inline-flex">
  <button
    type="button"
    className="rounded-xl bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm"
    data-testid="task-step-cases-button"
    onClick={controller.handleOpenCasesForTask}
  >
    Cases
  </button>
  {(controller.casesSummary?.total_unread ?? 0) > 0 ? (
    <span
      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
      data-testid="task-step-cases-unread-badge"
    >
      {controller.casesSummary!.total_unread}
    </span>
  ) : null}
</div>
```

Exact placement within the footer layout is a UI decision left to the implementer — the badge logic and data source are specified here.

### Step 12 — Notification badge on task cards

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepCard.tsx` (or equivalent)

The card view model (`vm`) already carries `casesSummary` after step 3. Render a badge when `vm.casesSummary?.total_unread > 0`:

```tsx
{(vm.casesSummary?.total_unread ?? 0) > 0 ? (
  <span
    className="inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
    data-testid={`task-card-cases-badge-${vm.stepId}`}
  >
    {vm.casesSummary!.total_unread}
  </span>
) : null}
```

Exact placement within the card (corner overlay vs. inline) is a UI decision left to the implementer.

## Risks and mitigations

- Risk: `cases_summary` not yet returned by backend — `TaskStepSchema` uses `.nullable().optional()`, so `null` / missing field both parse to `null`. No runtime error; badge simply does not render.
  Mitigation: defensive `.optional()` on the Zod field; `step?.cases_summary ?? null` fallback everywhere.

- Risk: `single_unread_case_id` present but stale (case was read since last task step fetch) — navigation opens the conversation surface; user sees a conversation with no new messages.
  Mitigation: acceptable UX; conversation surface handles its own read state.

- Risk: `CasesViewProvider` query key collision with global cases view — `useListCasesQuery` uses `caseKeys.list(params)` as the query key. When `entity_client_id` is included in params the key is unique. No collision.
  Mitigation: verify `caseKeys.list` includes all params in the key object before shipping.

- Risk: `CASE_LINK_ENTITY_TYPE` type import — the type `(typeof CASE_LINK_ENTITY_TYPE)[number]` must be available in `CasesViewProvider.tsx`. Confirm the array is exported from `packages/cases/src/types.ts` (it is: `export const CASE_LINK_ENTITY_TYPE = ...`).
  Mitigation: import directly from `../types` inside the package.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all workspaces
- Manual smoke test — task with 0 cases: cases button → case creation slide opens
- Manual smoke test — task with 1 case, 1 unread case: cases button → conversation slide opens
- Manual smoke test — task with 2+ cases, mixed unread: cases button → task cases slide opens, shows only that task's cases
- Manual smoke test — `cases_summary: null` field absent (before backend ships): no badge, no crash
- Badge visibility: task card shows badge count when `total_unread > 0`, no badge when `0`

## Review log

- `2026-05-29` `claude-sonnet-4-6`: Initial plan authored
- `2026-05-29` `github-copilot`: Implemented workers task-step cases summary flow, wrote summary, and archived the plan.

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `github-copilot`
