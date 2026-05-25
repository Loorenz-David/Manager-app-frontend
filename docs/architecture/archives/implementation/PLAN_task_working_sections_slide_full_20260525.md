# PLAN_task_working_sections_slide_full_20260525

## Metadata

- Plan ID: `PLAN_task_working_sections_slide_full_20260525`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-25T00:00:00Z`
- Last updated at (UTC): `2026-05-25T07:37:06Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Replace the `TaskWorkingSectionsSlidePage` stub with a fully functional working sections management page. The page uses `StagedForm` with three tabs (Selected, Live Flow, Stats) and no bottom navigation bar. The Selected tab lets the user add/remove working section steps for the task with optimistic updates and worker assignment via the existing worker picker surface.
- Business/user intent: Managers need to assign working sections to a task and reassign workers from a single page. Operations must feel instant — the UI reacts before the server responds.
- Non-goals: "Live Flow" and "Stats" tabs are left as "Coming soon" stubs. No new worker management features. No changes to the working section picker query or store.

## Scope

- In scope:
  - 3 new API functions: `addTaskStep`, `removeTaskStep`, `assignStepWorker`
  - 3 new action hooks with full optimistic update + rollback: `useAddTaskStep`, `useRemoveTaskStep`, `useAssignStepWorker`
  - 1 new controller: `useTaskWorkingSectionsController`
  - 1 new provider + context hook: `TaskWorkingSectionsProvider`
  - 1 new component: `TaskWorkingSectionsStepList`
  - Replace existing `TaskWorkingSectionsSlidePage` stub with full implementation
  - `StagedForm` used with `showNavigation={false}` — **no changes to the primitive needed** (the prop already exists)
- Out of scope:
  - "Live Flow" tab content
  - "Stats" tab content
  - Changes to `TaskWorkingSectionsField` counts (they update automatically via shared TanStack Query cache)
  - Any changes to `surfaces.ts`, `use-task-detail.flow.ts` (already updated by prior plan `PLAN_task_working_sections_field_20260524`)
- Assumptions:
  - `PLAN_task_working_sections_field_20260524` has been executed: `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`, `TaskWorkingSectionsSurfaceProps`, `preloadTaskWorkingSectionsSurface`, and `openWorkingSectionsSlide` are already in place.
  - `TaskWorkingSectionsSlidePage` stub already exists at `src/pages/tasks/TaskWorkingSectionsSlidePage.tsx` and will be replaced in full.
  - `crypto.randomUUID()` is available (modern browser target).
  - `ApiEnvelopeSchema` is imported from `@/types/api` (matches `delete-item-issue.ts` pattern).
  - `apiClient.post(url, ResponseSchema, body)` and `apiClient.delete(url, ResponseSchema)` are the correct call signatures (matches `set-item-upholstery-quantity.ts` and `delete-item-issue.ts`).

## Clarifications required

*(none — all ambiguities resolved by reading existing files)*

## Acceptance criteria

1. Opening the working sections slide from a task detail page renders a `StagedForm` with three tab entries (Selected, Live Flow, Stats) and no bottom navigation bar visible.
2. The Selected tab lists all working sections filtered by the task item's `item_major_category_snapshot`. Each card shows the section icon, name, and a `StatePill` for the current step state (if a step exists).
3. Tapping an unselected or completed section with a single member auto-assigns the member and adds a new step immediately (optimistic). With multiple members, the worker picker sheet opens first.
4. Tapping an unselected or completed section with zero members adds a step with no worker assignment immediately (optimistic).
5. Tapping an active (selected, non-completed) section opens the worker picker for reassignment. Selecting a worker updates `assigned_worker_id` on the step immediately (optimistic).
6. Tapping the X button on an active section removes the step immediately (optimistic). On error, the step is restored.
7. The `TaskWorkingSectionsField` counts in `TaskDetailSlidePage` (assigned / completed) reflect the optimistic changes in real time because both pages share the same `taskKeys.detail(taskId)` TanStack Query cache entry.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: mutation hook pattern, optimistic update with snapshot/rollback, `onMutate` / `onError` / `onSettled`
- `architecture/05_server_state.md`: TanStack Query cache manipulation, `setQueryData`, `cancelQueries`, `invalidateQueries`
- `architecture/04_api_client.md`: `apiClient.post` / `apiClient.delete` signatures
- `architecture/23_providers.md`: context + provider shell
- `architecture/07_components.md`: components consume context only; no logic layer imports
- `architecture/15_feature_structure.md`: layer dependency rules

### Local extensions loaded

- `architecture/04_api_client_local.md`: backend error shape, response envelope

### File read intent — pattern vs. relational

Permitted reads completed:
- `src/features/items/api/delete-item-issue.ts` — exact `apiClient.delete` call signature
- `src/features/items/api/set-item-upholstery-quantity.ts` — exact `apiClient.post` call signature and `ApiEnvelopeSchema` import path
- `src/features/items/actions/use-delete-item-issue.ts` — `onSettled` invalidation pattern with `taskId as never` cast
- `src/features/tasks/api/task-keys.ts` — confirmed `taskKeys.detail(id: TaskId)` key shape
- `src/features/tasks/types.ts` — `TaskDetailRaw`, `task_steps` field shape
- `src/features/working-sections/types.ts` — `WorkingSectionOption`, `WorkingSectionMember`
- `src/features/working-sections/components/fields/WorkingSectionPickerField.tsx` — card interaction model, worker picker surface invocation
- `src/features/working-sections/flows/use-working-section-picker.flow.ts` — how to get section options with category filtering
- `src/features/tasks/flows/use-task-detail.flow.ts` — confirmed `openWorkingSectionsSlide` already implemented
- `src/features/tasks/surfaces.ts` — confirmed `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` already registered
- `src/hooks/use-staged-form.ts` — `useStagedForm` return shape and `mode: 'free'` usage
- `src/components/primitives/staged-form/StagedForm.tsx` — confirmed `showNavigation` prop exists with default `true`
- `src/components/primitives/state-pill/StatePill.tsx` — `StatePillVariant` union, props
- `src/pages/tasks/TaskWorkingSectionsSlidePage.tsx` — confirmed it is the stub to replace

### Skill selection

- Primary skill: none (direct implementation from contracts)

## Domain schemas consulted

- `src/features/tasks/types.ts`:
  - `TaskDetailRaw.task_steps` items: `{ client_id, task_id, state: string, readiness_status: string, sequence_order: number|null, working_section_id: string|null, assigned_worker_id: string|null, total_dependencies: number, completed_dependencies: number, working_section_name_snapshot: string|null, assigned_worker_display_name_snapshot: string|null, created_at: string, closed_at: string|null, latest_state_records: Record<string,unknown>|null|undefined }`
  - `state` is `z.string()` (open string, not an enum) — any string is valid
- `src/features/working-sections/types.ts`:
  - `WorkingSectionOption` has `client_id`, `name`, `image: string|null`, `members: WorkingSectionMember[]`, `item_categories: WorkingSectionItemCategory[]`
  - `WorkingSectionMember` has `client_id`, `username`, `profile_picture: string|null`
  - `WorkingSectionItemCategory` has `major_category: string`

## Selected contracts

- `architecture/04_api_client.md`: API function signatures
- `architecture/05_server_state.md`: TanStack Query patterns
- `architecture/08_hooks.md`: optimistic mutation pattern
- `architecture/23_providers.md`: provider + context hook structure
- `architecture/07_components.md`: component consumes context only

## Implementation plan

### Step 1 — API function: `add-task-step.ts`

Create `src/features/tasks/api/add-task-step.ts`:

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const AddTaskStepInputSchema = z.object({
  task_id: z.string(),
  working_section_id: z.string(),
  worker_id: z.string().optional(),
});
export type AddTaskStepInput = z.infer<typeof AddTaskStepInputSchema>;

const AddTaskStepResponseSchema = ApiEnvelopeSchema(z.object({ step_id: z.string() })).extend({
  ok: z.literal(true),
});

export async function addTaskStep(input: AddTaskStepInput) {
  const { task_id, ...body } = AddTaskStepInputSchema.parse(input);
  return apiClient.post(`/api/v1/tasks/${task_id}/steps`, AddTaskStepResponseSchema, body);
}
```

### Step 2 — API function: `remove-task-step.ts`

Create `src/features/tasks/api/remove-task-step.ts`:

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const RemoveTaskStepInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
});
export type RemoveTaskStepInput = z.infer<typeof RemoveTaskStepInputSchema>;

const RemoveTaskStepResponseSchema = ApiEnvelopeSchema(z.object({ step_id: z.string() })).extend({
  ok: z.literal(true),
});

export async function removeTaskStep(input: RemoveTaskStepInput) {
  const { task_id, step_id } = RemoveTaskStepInputSchema.parse(input);
  return apiClient.delete(
    `/api/v1/tasks/${task_id}/steps/${step_id}`,
    RemoveTaskStepResponseSchema,
  );
}
```

### Step 3 — API function: `assign-step-worker.ts`

Create `src/features/tasks/api/assign-step-worker.ts`:

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const AssignStepWorkerInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
  worker_id: z.string(),
});
export type AssignStepWorkerInput = z.infer<typeof AssignStepWorkerInputSchema>;

const AssignStepWorkerResponseSchema = ApiEnvelopeSchema(
  z.object({ assignment_id: z.string(), worker_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function assignStepWorker(input: AssignStepWorkerInput) {
  const { task_id, step_id, ...body } = AssignStepWorkerInputSchema.parse(input);
  return apiClient.post(
    `/api/v1/tasks/${task_id}/steps/${step_id}/assign-worker`,
    AssignStepWorkerResponseSchema,
    body,
  );
}
```

### Step 4 — Action hook: `use-add-task-step.ts`

The hook is bound to `taskId`. The mutation input does **not** include `task_id` — the hook injects it. The optimistic update adds a new step entry to the `task_steps` array in `taskKeys.detail(taskId)` cache. `crypto.randomUUID()` is used as the temporary `client_id`; it is replaced by real server data on `onSettled` invalidation.

Create `src/features/tasks/actions/use-add-task-step.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { addTaskStep } from '../api/add-task-step';

export type AddTaskStepVariables = {
  working_section_id: string;
  worker_id?: string;
};

export function useAddTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddTaskStepVariables) =>
      addTaskStep({ ...input, task_id: taskId }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) return old;
        return {
          ...old,
          task_steps: [
            ...old.task_steps,
            {
              client_id: crypto.randomUUID(),
              task_id: taskId,
              state: 'pending',
              readiness_status: 'pending',
              sequence_order: null,
              working_section_id: input.working_section_id,
              assigned_worker_id: input.worker_id ?? null,
              total_dependencies: 0,
              completed_dependencies: 0,
              working_section_name_snapshot: null,
              assigned_worker_display_name_snapshot: null,
              created_at: new Date().toISOString(),
              closed_at: null,
              latest_state_records: null,
            },
          ],
        };
      });

      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
```

### Step 5 — Action hook: `use-remove-task-step.ts`

The optimistic update filters out the step by `step_id`.

Create `src/features/tasks/actions/use-remove-task-step.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { removeTaskStep } from '../api/remove-task-step';

export type RemoveTaskStepVariables = {
  step_id: string;
};

export function useRemoveTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveTaskStepVariables) =>
      removeTaskStep({ ...input, task_id: taskId }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) return old;
        return {
          ...old,
          task_steps: old.task_steps.filter((s) => s.client_id !== input.step_id),
        };
      });

      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
```

### Step 6 — Action hook: `use-assign-step-worker.ts`

The optimistic update patches `assigned_worker_id` on the matching step.

Create `src/features/tasks/actions/use-assign-step-worker.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { assignStepWorker } from '../api/assign-step-worker';

export type AssignStepWorkerVariables = {
  step_id: string;
  worker_id: string;
};

export function useAssignStepWorker(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignStepWorkerVariables) =>
      assignStepWorker({ ...input, task_id: taskId }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) return old;
        return {
          ...old,
          task_steps: old.task_steps.map((s) =>
            s.client_id === input.step_id
              ? { ...s, assigned_worker_id: input.worker_id }
              : s,
          ),
        };
      });

      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
```

### Step 7 — Controller: `use-task-working-sections.controller.ts`

Aggregates the task query, working section picker flow, and the three mutations. Filters sections by `item_major_category_snapshot` (same logic as `WorkingSectionPickerField`).

Create `src/features/tasks/controllers/use-task-working-sections.controller.ts`:

```ts
import { useMemo } from 'react';

import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { useWorkingSectionPickerFlow } from '@/features/working-sections/flows/use-working-section-picker.flow';

import { useAddTaskStep } from '../actions/use-add-task-step';
import { useAssignStepWorker } from '../actions/use-assign-step-worker';
import { useRemoveTaskStep } from '../actions/use-remove-task-step';

export function useTaskWorkingSectionsController(taskId: string) {
  const taskQuery = useGetTaskQuery(taskId);
  const flow = useWorkingSectionPickerFlow();

  const addTaskStep = useAddTaskStep(taskId);
  const removeTaskStep = useRemoveTaskStep(taskId);
  const assignStepWorker = useAssignStepWorker(taskId);

  const majorCategory = taskQuery.data?.item?.item_major_category_snapshot ?? null;
  const taskSteps = taskQuery.data?.task_steps ?? [];

  const workingSectionOptions = useMemo(
    () =>
      majorCategory === null
        ? flow.options
        : flow.options.filter((s) =>
            s.item_categories.some((c) => c.major_category === majorCategory),
          ),
    [flow.options, majorCategory],
  );

  return {
    taskId,
    isPending: taskQuery.isPending,
    isError: taskQuery.isError,
    taskSteps,
    workingSectionOptions,
    isOptionsLoading: flow.isLoading,
    addTaskStep,
    removeTaskStep,
    assignStepWorker,
  };
}

export type TaskWorkingSectionsController = ReturnType<
  typeof useTaskWorkingSectionsController
>;
```

### Step 8 — Provider: `TaskWorkingSectionsProvider.tsx`

Create `src/features/tasks/providers/TaskWorkingSectionsProvider.tsx`:

```tsx
import { createContext, useContext } from 'react';

import {
  useTaskWorkingSectionsController,
  type TaskWorkingSectionsController,
} from '../controllers/use-task-working-sections.controller';

const TaskWorkingSectionsContext =
  createContext<TaskWorkingSectionsController | null>(null);

export function TaskWorkingSectionsProvider({
  taskId,
  children,
}: {
  taskId: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useTaskWorkingSectionsController(taskId);
  return (
    <TaskWorkingSectionsContext.Provider value={controller}>
      {children}
    </TaskWorkingSectionsContext.Provider>
  );
}

export function useTaskWorkingSectionsContext(): TaskWorkingSectionsController {
  const ctx = useContext(TaskWorkingSectionsContext);
  if (!ctx) {
    throw new Error(
      'useTaskWorkingSectionsContext must be used inside TaskWorkingSectionsProvider',
    );
  }
  return ctx;
}
```

### Step 9 — Component: `TaskWorkingSectionsStepList.tsx`

#### Key logic

- **`getLatestNonSkippedStep(steps, sectionId)`**: filters steps by `working_section_id === sectionId` and `state !== 'skipped'`, sorts ascending by `created_at`, returns the last one. The backend sets `state: 'skipped'` when a step is removed — so skipped steps are invisible to the user.
- **`isActive`**: `latestStep !== null && latestStep.closed_at === null`. Shows as selected (primary color).
- **`isCompleted`**: `latestStep !== null && latestStep.closed_at !== null`. Shows as unselected styling (tappable to add a new step — the backend supports multiple steps per working section).
- **Tap behavior**:
  - Active section → always open worker picker for reassignment (even with 1 member, per user requirement)
  - Unselected or completed section, 0 members → `addTaskStep.mutate` with no `worker_id`
  - Unselected or completed section, 1 member → `addTaskStep.mutate` with that member auto-assigned (no picker)
  - Unselected or completed section, 2+ members → open worker picker → on select, `addTaskStep.mutate`
- **X button** (only on active steps): `removeTaskStep.mutate({ step_id: latestStep.client_id })`

#### State pill mapping

```
'working'              → 'active'
'stalled'              → 'warning'
'ready' | 'completed'  → 'success'
'failed'               → 'danger'
default                → 'neutral'
```

Create `src/features/tasks/components/working-sections/TaskWorkingSectionsStepList.tsx`:

```tsx
import { Image, X } from 'lucide-react';
import { useMemo } from 'react';

import { StatePill } from '@/components/primitives/state-pill';
import type { StatePillVariant } from '@/components/primitives/state-pill';
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  preloadWorkingSectionWorkerPickerSurface,
} from '@/features/working-sections/surfaces';
import type { WorkingSectionMember, WorkingSectionOption } from '@/features/working-sections/types';
import { usePreloadSurface } from '@/hooks/use-preload-surface';
import { cn } from '@/lib/utils';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

import { useTaskWorkingSectionsContext } from '../../providers/TaskWorkingSectionsProvider';
import type { TaskDetailRaw } from '../../types';

type TaskStep = TaskDetailRaw['task_steps'][number];

function stepStateToVariant(state: string): StatePillVariant {
  switch (state) {
    case 'working':
      return 'active';
    case 'stalled':
      return 'warning';
    case 'ready':
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getLatestNonSkippedStep(steps: TaskStep[], sectionId: string): TaskStep | null {
  const sectionSteps = steps
    .filter((s) => s.working_section_id === sectionId && s.state !== 'skipped')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return sectionSteps[sectionSteps.length - 1] ?? null;
}

type StepCardProps = {
  section: WorkingSectionOption;
  latestStep: TaskStep | null;
  onPress: (section: WorkingSectionOption, latestStep: TaskStep | null) => void;
  onDeselect: (stepId: string) => void;
};

function StepCard({
  section,
  latestStep,
  onPress,
  onDeselect,
}: StepCardProps): React.JSX.Element {
  const isActive = latestStep !== null && latestStep.closed_at === null;

  return (
    <div
      aria-pressed={isActive}
      className={cn(
        'relative flex min-h-14 w-full cursor-pointer select-none items-stretch overflow-hidden rounded-xl border transition-colors duration-150 pl-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive
          ? 'border-primary bg-primary text-card'
          : 'border-border bg-card text-foreground',
      )}
      data-testid={`working-section-step-card-${section.client_id}`}
      role="button"
      tabIndex={0}
      onClick={() => onPress(section, latestStep)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPress(section, latestStep);
        }
      }}
    >
      {section.image ? (
        <div aria-hidden="true" className="w-16 self-stretch shrink-0 overflow-hidden">
          <img
            alt=""
            aria-hidden="true"
            className="size-full object-cover"
            src={section.image}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex w-16 self-stretch shrink-0 items-center justify-center"
        >
          <Image className="size-5 opacity-50" />
        </div>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 justify-center">
        <span className="truncate text-sm font-medium">{section.name}</span>
        {latestStep ? (
          <StatePill
            className="w-fit"
            label={latestStep.state}
            variant={stepStateToVariant(latestStep.state)}
          />
        ) : null}
      </span>

      {isActive ? (
        <button
          aria-label={`Remove ${section.name}`}
          className="mr-4 flex size-6 shrink-0 self-center items-center justify-center rounded-full p-1 opacity-70 hover:opacity-100"
          data-testid={`working-section-step-card-${section.client_id}-remove`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (latestStep) {
              onDeselect(latestStep.client_id);
            }
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export function TaskWorkingSectionsStepList(): React.JSX.Element {
  const {
    workingSectionOptions,
    taskSteps,
    isOptionsLoading,
    addTaskStep,
    removeTaskStep,
    assignStepWorker,
  } = useTaskWorkingSectionsContext();

  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);

  const stepListData = useMemo(
    () =>
      workingSectionOptions.map((section) => ({
        section,
        latestStep: getLatestNonSkippedStep(taskSteps, section.client_id),
      })),
    [workingSectionOptions, taskSteps],
  );

  function handlePress(section: WorkingSectionOption, latestStep: TaskStep | null): void {
    const isActive = latestStep !== null && latestStep.closed_at === null;

    if (isActive) {
      // Reassignment path: always open picker regardless of member count.
      useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
        sectionName: section.name,
        members: section.members,
        currentWorkerId: latestStep.assigned_worker_id,
        onSelect: (workerId: string) => {
          assignStepWorker.mutate({ step_id: latestStep.client_id, worker_id: workerId });
        },
      });
      return;
    }

    // Selection path (unselected or completed).
    if (section.members.length === 0) {
      addTaskStep.mutate({ working_section_id: section.client_id });
      return;
    }

    if (section.members.length === 1) {
      const member = section.members[0] as WorkingSectionMember;
      addTaskStep.mutate({
        working_section_id: section.client_id,
        worker_id: member.client_id,
      });
      return;
    }

    useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
      sectionName: section.name,
      members: section.members,
      currentWorkerId: null,
      onSelect: (workerId: string) => {
        addTaskStep.mutate({ working_section_id: section.client_id, worker_id: workerId });
      },
    });
  }

  function handleDeselect(stepId: string): void {
    removeTaskStep.mutate({ step_id: stepId });
  }

  if (isOptionsLoading && stepListData.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
        data-testid="working-section-step-list-loading"
      >
        Loading working sections…
      </p>
    );
  }

  if (!isOptionsLoading && stepListData.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
        data-testid="working-section-step-list-empty"
      >
        No working sections available.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="working-section-step-list">
      {stepListData.map(({ section, latestStep }) => (
        <StepCard
          key={section.client_id}
          latestStep={latestStep}
          section={section}
          onDeselect={handleDeselect}
          onPress={handlePress}
        />
      ))}
    </div>
  );
}
```

### Step 10 — Page: replace `TaskWorkingSectionsSlidePage.tsx` stub

Replace the entire file at `src/pages/tasks/TaskWorkingSectionsSlidePage.tsx`. The page:
- Reads `taskId` from surface props
- Sets the surface header title to "Working Sections"
- Wraps content in `TaskWorkingSectionsProvider`
- Inner content uses `useStagedForm` with `mode: 'free'` and three steps
- Renders `StagedForm` with `showNavigation={false}`
- "Live Flow" and "Stats" steps render "Coming soon" placeholders

```tsx
import { useEffect } from 'react';

import { StagedForm, StagedFormStep } from '@/components/primitives';
import { TaskWorkingSectionsStepList } from '@/features/tasks/components/working-sections/TaskWorkingSectionsStepList';
import { TaskWorkingSectionsProvider } from '@/features/tasks/providers/TaskWorkingSectionsProvider';
import type { TaskWorkingSectionsSurfaceProps } from '@/features/tasks/surfaces';
import { useStagedForm } from '@/hooks/use-staged-form';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

function TaskWorkingSectionsSlidePageContent(): React.JSX.Element {
  const staged = useStagedForm({
    steps: [
      { id: 'selected', title: 'Selected' },
      { id: 'live_flow', title: 'Live Flow' },
      { id: 'stats', title: 'Stats' },
    ],
    mode: 'free',
  });

  return (
    <StagedForm
      activeStepId={staged.activeStepId}
      data-testid="task-working-sections-staged-form"
      direction={staged.direction}
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode={staged.navigationMode}
      onAdvance={staged.advance}
      onBack={staged.back}
      onNavigate={staged.navigateTo}
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="selected" className="px-0">
        <div className="flex flex-col gap-2 px-4 py-4">
          <TaskWorkingSectionsStepList />
        </div>
      </StagedFormStep>

      <StagedFormStep id="live_flow" className="px-0">
        <div
          className="flex min-h-32 items-center justify-center p-6"
          data-testid="task-working-sections-live-flow-step"
        >
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </StagedFormStep>

      <StagedFormStep id="stats" className="px-0">
        <div
          className="flex min-h-32 items-center justify-center p-6"
          data-testid="task-working-sections-stats-step"
        >
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </StagedFormStep>
    </StagedForm>
  );
}

export function TaskWorkingSectionsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskWorkingSectionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Working Sections');
    header?.setActions(null);
  }, [header]);

  return (
    <TaskWorkingSectionsProvider taskId={taskId}>
      <TaskWorkingSectionsSlidePageContent />
    </TaskWorkingSectionsProvider>
  );
}
```

## Risks and mitigations

- Risk: `StagedFormStep` import may fail if it is not re-exported from `@/components/primitives`.
  Mitigation: Confirmed from `src/components/primitives/staged-form/index.ts` that `StagedFormStep` is exported, and from `InternalFormContent.tsx` that it is imported from `@/components/primitives`.

- Risk: `TaskDetailRaw` type mismatch for the optimistic step — `state` field is typed as `string` (open), but the Zod schema parses it as-is, so `'pending'` is valid.
  Mitigation: Confirmed `state: z.string()` in `TaskDetailRawSchema.task_steps`.

- Risk: `WORKING_SECTION_WORKER_PICKER_SURFACE_ID` and `preloadWorkingSectionWorkerPickerSurface` import paths from `@/features/working-sections/surfaces` may not match actual exports.
  Mitigation: Confirmed both exports in `src/features/working-sections/surfaces.ts` (read during prior session).

- Risk: `useSurfaceStore` direct import for opening surfaces from outside a React event handler.
  Mitigation: Pattern confirmed in `WorkingSectionPickerField.tsx` lines 190–204 which uses `useSurfaceStore.getState().open(...)` directly.

- Risk: `apiClient.delete` signature — some APIs may require a request body or different signature.
  Mitigation: Confirmed `apiClient.delete(url, schema)` from `delete-item-issue.ts`. The remove step endpoint has no body per handoff doc.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual test (mobile):
  1. Open a task with an item category that has working sections
  2. Tap the Working Sections field → slide opens with "Selected" tab active, section list renders
  3. Tap an unselected section → card turns primary color (optimistic), X button appears
  4. Tap the X button → card returns to unselected (optimistic)
  5. Tap a section with multiple members → worker picker sheet opens → select worker → card turns primary
  6. Tap an active section card → worker picker opens for reassignment
  7. Tap "Live Flow" tab → "Coming soon" text renders
  8. Tap "Stats" tab → "Coming soon" text renders
  9. Confirm `TaskWorkingSectionsField` pill counts update in real time when switching back to `TaskDetailSlidePage`

## Review log

- `2026-05-25T07:37:06Z` — Implemented the full working-sections slide, passed `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`, wrote `docs/architecture/implemented_summaries/SUMMARY_PLAN_task_working_sections_slide_full_20260525.md`, and archived the plan.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: Codex
