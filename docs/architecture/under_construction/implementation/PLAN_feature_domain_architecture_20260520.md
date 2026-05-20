# PLAN_feature_domain_architecture_20260520

## Metadata

- Plan ID: `PLAN_feature_domain_architecture_20260520`
- Status: `under_construction`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-20T12:00:00Z`
- Last updated at (UTC): `2026-05-20T12:00:00Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Establish the complete frontend feature-domain architecture across all 13 feature verticals (9 operational + 4 configuration). This creates the typed entity contracts, Zod DTO schemas, query key factories, and domain-owned folder structures that all subsequent systems depend on.
- Business/user intent: Operational workflows (task management, item tracking, customer records, case management, upholstery operations) require a typed, validated data layer before any UI, form, or RHF system can be built safely. This plan creates that foundation.
- Non-goals: API fetch/mutation functions, query hooks, action hooks, controllers, providers, UI components, RHF forms, date/calendar system, field composition system.

## Scope

- In scope:
  - Augment `src/types/common.ts` — all branded entity IDs, shared `AddressSchema`
  - Augment `src/types/api.ts` — align with actual backend envelope `{ ok, data, warnings }`, add `ApiEnvelopeSchema` helper
  - Feature folder scaffolding for all 13 verticals with empty placeholder layers
  - `types.ts` for all 9 operational features — full 4-section DTO structure per `24_dto.md`
  - `api/<entity>-keys.ts` for all 9 operational features — full query key factory per `05_server_state.md`
  - Subfeature folder + types + keys: `tasks/subfeatures/task_steps/`, `items/subfeatures/item_images/`
  - Stub `types.ts` + `index.ts` for 4 configuration features
  - Update each feature's `index.ts` to export public types
  - Augment existing `tasks/types.ts`, `cases/types.ts`, `home/types.ts`, `settings/types.ts` stubs
- Out of scope: API fetch functions, query hooks, action hooks, controllers, providers, components, forms
- Assumptions:
  - `src/types/common.ts` already exists with `Branded<T, Brand>` utility and `UserId` — this plan extends it
  - `src/types/api.ts` already exists — this plan augments it to match backend contract
  - Existing feature scaffolds (`tasks`, `cases`, `home`, `settings`, `stats`) must have their `route-entry.tsx`, `controllers/`, `providers/`, `components/` left intact — only `types.ts` and `index.ts` are modified/replaced
  - Date-only fields (`ready_by_at`, `scheduled_start_at`, `scheduled_end_at`) use `"YYYY-MM-DD"` format per confirmed convention
  - Backend serializes `Numeric`/`Decimal` DB columns as strings in JSON responses

## Clarifications required

- [ ] **Enum values for task domain enums**: `TaskTypeEnum`, `TaskStateEnum`, `TaskPriorityEnum`, `TaskReturnSourceEnum`, `TaskItemLocationEnum`, `TaskReturnMethodEnum`, `TaskFulfillmentMethodEnum`, `TaskStepStateEnum`, `TaskStepReadinessStatusEnum` — the plan uses `z.string()` placeholders. Codex must replace with exact string literals before merging (check backend Python enum definitions).
- [ ] **Enum values for case domain enums**: `CaseStateEnum`, `CaseLinkEntityTypeEnum`, `CaseLinkRoleEnum` — same as above, `z.string()` placeholder.
- [ ] **Backend `data` field shape per endpoint**: The API readme shows `data: any` for all 200 responses. The inner payload structure per endpoint (e.g. does list return `{ items: Task[], total: number }` or `Task[]` directly?) must be confirmed before implementing API functions. This plan defines entity schemas; API function response schema wrappers are deferred.
- [ ] **Customers: no `secondary_email` / `secondary_phone_number`** in the DB table or API endpoints. The previous field composition plan (`PLAN_customer_item_features_field_composition_20260520.md`) included these fields — that plan must be revised to remove them or confirm they are stored in `additional_details` JSON.
- [ ] **Item `state` enum**: `ItemStateEnum` values unknown. Use `z.string()` placeholder.
- [ ] **Upholstery currency enum**: `UpholsteryCurrencyEnum` values unknown (likely `'swedish_krona' | 'danish_krona' | 'euro'` — confirm).

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after all steps are applied.
2. Every operational feature has a `types.ts` with all four DTO sections in order: Response DTOs → Request DTOs → Query Params DTOs → View Models.
3. Every operational feature has `api/<entity>-keys.ts` with the five-key factory shape (`all`, `lists()`, `list(params)`, `details()`, `detail(id)`).
4. All branded ID types for all entities are defined in `src/types/common.ts`.
5. Configuration features each have a valid (even if mostly empty) `types.ts` and `index.ts`.
6. No feature has a deep import violation — all cross-feature type access goes through `index.ts`.
7. Existing `route-entry.tsx`, controller, provider, and component files are not modified.

## Contracts and skills

### Contracts loaded

- `architecture/24_dto.md`: DTO category ordering, four-section `types.ts` structure, Response/Request/QueryParams/ViewModel naming rules
- `architecture/15_feature_structure.md`: feature folder layout, layer import rules, `index.ts` boundary, cross-feature import rules
- `architecture/16_feature_workflow.md`: Step 1 (types) and Step 2 (query keys) — this plan only covers these two steps
- `architecture/05_server_state.md`: query key factory shape, five-key structure
- `architecture/04_api_client.md`: `ApiRequestError`, `apiClient` usage pattern, response envelope approach
- `architecture/08_hooks.md`: action hook patterns — referenced for view model transformer design decisions
- `architecture/21_realtime.md`: confirms branded IDs must appear in `src/types/common.ts`

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` pattern — informs which files must NOT be modified

### File read intent — pattern vs. relational

Permitted reads taken:
- `src/types/common.ts` — to see existing `Branded<T, Brand>` utility and `UserId` (relational: what exists)
- `src/types/api.ts` — to see current shape vs. backend contract (relational: what exists)
- `src/features/tasks/types.ts` — to see existing stub (relational: what exists)
- `docs/architecture/backend/tables/README.md` — to derive entity field definitions (relational: understanding what the backend owns)
- `docs/architecture/backend/routers_endpoints/README.md` — to derive request DTO field sets (relational: understanding what the backend expects)

## Implementation plan

---

### Step 1 — Augment `src/types/common.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/types/common.ts`

Replace the entire file. Keep the existing `Branded` utility and `UserId`. Add all entity-domain branded IDs and shared `AddressSchema`.

```ts
import { z } from 'zod';

declare const _brand: unique symbol;

export type Branded<T, Brand extends string> = T & {
  readonly [_brand]: Brand;
};

// ─── Entity Branded IDs ──────────────────────────────────────────────────────
// One ID type per domain entity that has a public client_id.
// Used as the return type in Zod .transform() at the schema boundary.

export type UserId = Branded<string, 'UserId'>;
export type TaskId = Branded<string, 'TaskId'>;
export type TaskStepId = Branded<string, 'TaskStepId'>;
export type TaskNoteId = Branded<string, 'TaskNoteId'>;
export type ItemId = Branded<string, 'ItemId'>;
export type ItemImageId = Branded<string, 'ItemImageId'>;
export type ItemIssueId = Branded<string, 'ItemIssueId'>;
export type ItemUpholsteryId = Branded<string, 'ItemUpholsteryId'>;
export type CustomerId = Branded<string, 'CustomerId'>;
export type CaseId = Branded<string, 'CaseId'>;
export type CaseConversationId = Branded<string, 'CaseConversationId'>;
export type CaseParticipantId = Branded<string, 'CaseParticipantId'>;
export type CaseLinkId = Branded<string, 'CaseLinkId'>;
export type WorkingSectionId = Branded<string, 'WorkingSectionId'>;
export type UpholsteryId = Branded<string, 'UpholsteryId'>;
export type UpholsteryInventoryId = Branded<string, 'UpholsteryInventoryId'>;
export type UpholsteryRequirementId = Branded<string, 'UpholsteryRequirementId'>;
export type WorkspaceId = Branded<string, 'WorkspaceId'>;

// ─── Shared value schemas ─────────────────────────────────────────────────────

// Date-only string — "YYYY-MM-DD". Backend resolves timezone; frontend renders UTC.
export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DateOnlySchema = z.string().regex(DATE_ONLY_REGEX, 'Invalid date format. Expected YYYY-MM-DD.');
export type DateOnly = z.infer<typeof DateOnlySchema>;

// Address — JSON object stored in the DB. Exact sub-field structure TBD per backend.
// TODO: replace with strict sub-fields once backend address format is confirmed.
export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
}).passthrough().nullable();
export type Address = z.infer<typeof AddressSchema>;

// Decimal string — Numeric/Decimal DB columns serialized as strings by backend.
// Convert to number for display calculations; never store as float.
export const DecimalStringSchema = z.string().nullable();
export type DecimalString = z.infer<typeof DecimalStringSchema>;
```

---

### Step 2 — Augment `src/types/api.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/types/api.ts`

Align with actual backend contract: `{ ok: boolean, data: any, warnings: string[] }`.
Keep existing TypeScript types for backward compat; add Zod schemas alongside them.

```ts
import { z } from 'zod';

// ─── Backend response envelope ────────────────────────────────────────────────
// All backend endpoints return: { ok: boolean, data: <payload>, warnings: string[] }

export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema,
    warnings: z.array(z.string()),
  });

// ─── Backend error envelope ───────────────────────────────────────────────────
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field_errors: z.record(z.array(z.string())).optional(),
  }),
});

// ─── TypeScript convenience types ─────────────────────────────────────────────
// Kept for code that predates Zod schema approach. Prefer ApiEnvelopeSchema for new code.

export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  warnings: string[];
};

export type ApiError = {
  message: string;
  code?: string;
  field_errors?: Record<string, string[]>;
};
```

---

### Step 3 — Feature folder scaffolding

Create the following folder structures. For features that already exist (`tasks`, `cases`, `home`, `settings`, `stats`), only create the files that don't exist yet. **Never modify existing `route-entry.tsx`, controller files, provider files, or component files.**

**New features to create (full scaffold):**

```
src/features/customers/
  api/                          ← empty folder (placeholder)
  actions/                      ← empty folder (placeholder)
  controllers/                  ← empty folder (placeholder)
  providers/                    ← empty folder (placeholder)
  components/                   ← empty folder (placeholder)
  types.ts                      ← implemented in Step 7
  index.ts                      ← implemented in Step 15

src/features/users/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 9
  index.ts                      ← Step 15

src/features/account/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 10
  index.ts                      ← Step 15

src/features/working_sections/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 11
  index.ts                      ← Step 15

src/features/upholstery/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 12
  index.ts                      ← Step 15

src/features/upholstery_requirements/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 13
  index.ts                      ← Step 15
```

**Subfeature scaffolds (new within existing features):**

```
src/features/tasks/subfeatures/task_steps/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 4
  index.ts                      ← Step 15

src/features/items/subfeatures/item_images/
  api/
  actions/
  controllers/
  providers/
  components/
  types.ts                      ← Step 6
  index.ts                      ← Step 15
```

**Items feature (create if not already present — it has no scaffold yet):**

```
src/features/items/
  api/
  actions/
  controllers/
  providers/
  components/
  subfeatures/                  ← created above
  types.ts                      ← Step 5
  index.ts                      ← Step 15
```

**Configuration feature stubs:**

```
src/features/items_configuration/
  types.ts                      ← Step 14
  index.ts                      ← Step 14

src/features/working_sections_configuration/
  types.ts                      ← Step 14
  index.ts                      ← Step 14

src/features/static_costs_configuration/
  types.ts                      ← Step 14
  index.ts                      ← Step 14
```

To create empty placeholder files inside empty folders (so git tracks them), create a single-line `// placeholder` comment `.ts` file named `index.ts` or leave the folder truly empty if the build system handles it. Since TypeScript needs something to scan, do NOT create placeholder files inside `api/`, `actions/`, `controllers/`, `providers/`, `components/` at this stage — just create the directories. The `types.ts` and `index.ts` files at the feature root are the only files needed now.

---

### Step 4 — `tasks` feature: types + query keys

**Pre-condition — patch `use-tasks-view.controller.ts` before replacing `types.ts`**

`src/features/tasks/controllers/use-tasks-view.controller.ts` imports `TasksState` from `../types` and re-exports it as `TasksViewController`. That import will break when `types.ts` is replaced. Update the controller to inline the empty-object type so it no longer depends on the old stub:

```ts
// Before (remove this):
// import type { TasksState } from '../types';
// export type TasksViewController = TasksState;

// After:
export type TasksViewController = Record<string, never>;

export function useTasksViewController(): TasksViewController {
  return {};
}
```

---

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`

Replace the existing stub entirely.

```ts
import { z } from 'zod';
import type { TaskId, CustomerId } from '@/types/common';
import { DateOnlySchema, AddressSchema } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  // Public client-facing ID. Not the backend database primary key.
  id:                          z.string().transform((v) => v as TaskId),
  task_scalar_id:               z.number().int(),

  // TODO: replace z.string() with z.enum([...]) once enum values confirmed with backend.
  task_type:                    z.string(),          // TaskTypeEnum
  priority:                     z.string(),          // TaskPriorityEnum
  state:                        z.string(),          // TaskStateEnum
  return_source:                z.string().nullable(), // TaskReturnSourceEnum
  item_location:                z.string().nullable(), // TaskItemLocationEnum
  return_method:                z.string().nullable(), // TaskReturnMethodEnum
  fulfillment_method:           z.string().nullable(), // TaskFulfillmentMethodEnum

  title:                        z.string().nullable(),
  summary:                      z.string().nullable(),
  additional_details:           z.record(z.unknown()).nullable(),

  // Date-only fields — "YYYY-MM-DD". Backend resolves timezone.
  ready_by_at:                  DateOnlySchema.nullable(),
  scheduled_start_at:           DateOnlySchema.nullable(),
  scheduled_end_at:             DateOnlySchema.nullable(),

  customer_id:                  z.string().transform((v) => v as CustomerId).nullable(),
  primary_phone_number:         z.string().nullable(),
  secondary_phone_number:       z.string().nullable(),
  primary_email:                z.string().nullable(),
  secondary_email:              z.string().nullable(),
  address:                      AddressSchema,

  created_at:                   z.string().datetime({ offset: true }),
  created_by_id:                z.string().nullable(),
  updated_at:                   z.string().datetime({ offset: true }).nullable(),
  updated_by_id:                z.string().nullable(),
  closed_at:                    z.string().datetime({ offset: true }).nullable(),

  recorded_time_marked_wrong:   z.boolean(),
  taken_from_average:           z.boolean(),
});

export type Task = z.infer<typeof TaskSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/tasks — create a new task
// client_id is generated by the frontend (crypto.randomUUID()) before the request fires.
export const CreateTaskInputSchema = z.object({
  client_id:             z.string().uuid(),
  task_type:             z.string().min(1, 'Task type is required.'),
  priority:              z.string().min(1, 'Priority is required.'),
  title:                 z.string().max(255).optional(),
  summary:               z.string().max(1024).optional(),
  ready_by_at:           DateOnlySchema.nullable().optional(),
  scheduled_start_at:    DateOnlySchema.nullable().optional(),
  scheduled_end_at:      DateOnlySchema.nullable().optional(),
  return_method:         z.string().optional(),
  fulfillment_method:    z.string().optional(),
  return_source:         z.string().optional(),
  item_location:         z.string().optional(),
  customer_id:           z.string().uuid().optional(),
  primary_phone_number:  z.string().optional(),
  secondary_phone_number: z.string().optional(),
  primary_email:         z.string().email('Enter a valid email.').optional().or(z.literal('')),
  secondary_email:       z.string().email('Enter a valid email.').optional().or(z.literal('')),
  address:               AddressSchema,
  additional_details:    z.record(z.unknown()).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

// PATCH /api/v1/tasks/{task_id} — update a task
// id must be included so the action hook can apply optimistic cache update before response.
export const UpdateTaskInputSchema = z.object({
  id:                    z.string().transform((v) => v as TaskId),
  title:                 z.string().max(255).nullable().optional(),
  summary:               z.string().max(1024).nullable().optional(),
  priority:              z.string().optional(),
  ready_by_at:           DateOnlySchema.nullable().optional(),
  scheduled_start_at:    DateOnlySchema.nullable().optional(),
  scheduled_end_at:      DateOnlySchema.nullable().optional(),
  return_method:         z.string().nullable().optional(),
  fulfillment_method:    z.string().nullable().optional(),
  return_source:         z.string().nullable().optional(),
  item_location:         z.string().nullable().optional(),
  customer_id:           z.string().uuid().nullable().optional(),
  primary_phone_number:  z.string().nullable().optional(),
  secondary_phone_number: z.string().nullable().optional(),
  primary_email:         z.string().email().nullable().optional().or(z.literal('')),
  secondary_email:       z.string().email().nullable().optional().or(z.literal('')),
  address:               AddressSchema,
  additional_details:    z.record(z.unknown()).nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

// State transition inputs — POST /api/v1/tasks/{task_id}/cancel|resolve|fail
export const TransitionTaskInputSchema = z.object({
  id: z.string().transform((v) => v as TaskId),
});
export type CancelTaskInput = z.infer<typeof TransitionTaskInputSchema>;
export type ResolveTaskInput = z.infer<typeof TransitionTaskInputSchema>;
export type FailTaskInput = z.infer<typeof TransitionTaskInputSchema>;

// POST /api/v1/tasks/{task_id}/notes
export const CreateTaskNoteInputSchema = z.object({
  task_id:   z.string().transform((v) => v as TaskId),
  note_type: z.string().min(1, 'Note type is required.'), // TaskNoteTypeEnum — confirm values
  content:   z.record(z.unknown()),
});
export type CreateTaskNoteInput = z.infer<typeof CreateTaskNoteInputSchema>;

// POST /api/v1/tasks/{task_id}/items
export const AddItemToTaskInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  item_id: z.string().uuid(),
  // role: TaskItemRoleEnum — TODO confirm values
});
export type AddItemToTaskInput = z.infer<typeof AddItemToTaskInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

// GET /api/v1/tasks
export type ListTasksParams = {
  limit?:  number;
  offset?: number;
  // TODO: confirm additional filter fields (state, customer_id, date range, etc.)
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type TaskViewModel = Task & {
  display_number:              string;       // "#123"
  state_label:                 string;       // TODO: replace with label map once enum confirmed
  priority_label:              string;
  task_type_label:             string;
  ready_by_formatted:          string | null;
  scheduled_range_formatted:   string | null;
  is_overdue:                  boolean;
  is_open:                     boolean;
  has_customer:                boolean;
  has_scheduled_dates:         boolean;
};

const _dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function _formatDateOnly(dateString: string | null): string | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : _dateOnlyFormatter.format(d);
}

export function toTaskViewModel(task: Task): TaskViewModel {
  const readyByFormatted = _formatDateOnly(task.ready_by_at);
  const startFormatted   = _formatDateOnly(task.scheduled_start_at);
  const endFormatted     = _formatDateOnly(task.scheduled_end_at);

  const scheduledRangeFormatted = startFormatted
    ? endFormatted && endFormatted !== startFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted
    : null;

  const isOverdue = Boolean(
    task.ready_by_at && new Date(task.ready_by_at) < new Date(),
  );

  return {
    ...task,
    display_number:            `#${task.task_scalar_id}`,
    // TODO: replace these with label maps once enum values are confirmed:
    state_label:               task.state,
    priority_label:            task.priority,
    task_type_label:           task.task_type,
    ready_by_formatted:        readyByFormatted,
    scheduled_range_formatted: scheduledRangeFormatted,
    is_overdue:                isOverdue,
    is_open:                   !['cancelled', 'failed', 'resolved'].includes(task.state),
    has_customer:              Boolean(task.customer_id),
    has_scheduled_dates:       Boolean(task.scheduled_start_at),
  };
}

// Builds a plausible optimistic Task from CreateTaskInput for cache seeding in onMutate.
// Server-assigned fields (task_scalar_id, state, created_at) use placeholder values.
export function toOptimisticTask(input: CreateTaskInput): Task {
  return TaskSchema.parse({
    id:                         input.client_id,
    task_scalar_id:             0, // placeholder — replaced by server response
    task_type:                  input.task_type,
    priority:                   input.priority,
    state:                      'pending', // TODO: confirm initial state enum value
    return_source:              input.return_source ?? null,
    item_location:              input.item_location ?? null,
    return_method:              input.return_method ?? null,
    fulfillment_method:         input.fulfillment_method ?? null,
    title:                      input.title ?? null,
    summary:                    input.summary ?? null,
    additional_details:         input.additional_details ?? null,
    ready_by_at:                input.ready_by_at ?? null,
    scheduled_start_at:         input.scheduled_start_at ?? null,
    scheduled_end_at:           input.scheduled_end_at ?? null,
    customer_id:                input.customer_id ?? null,
    primary_phone_number:       input.primary_phone_number ?? null,
    secondary_phone_number:     input.secondary_phone_number ?? null,
    primary_email:              input.primary_email ?? null,
    secondary_email:            input.secondary_email ?? null,
    address:                    input.address ?? null,
    created_at:                 new Date().toISOString(),
    created_by_id:              null,
    updated_at:                 null,
    updated_by_id:              null,
    closed_at:                  null,
    recorded_time_marked_wrong: false,
    taken_from_average:         false,
  });
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/task-keys.ts`

```ts
import type { TaskId } from '@/types/common';
import type { ListTasksParams } from '@/features/tasks/types';

export const taskKeys = {
  all:     ['tasks'] as const,
  lists:   () => [...taskKeys.all, 'list'] as const,
  list:    (params: ListTasksParams = {}) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail:  (id: TaskId) => [...taskKeys.details(), id] as const,
};
```

---

### Step 5 — `task_steps` subfeature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/subfeatures/task_steps/types.ts`

```ts
import { z } from 'zod';
import type { TaskStepId, TaskId, WorkingSectionId, UserId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const TaskStepSchema = z.object({
  id:                                   z.string().transform((v) => v as TaskStepId),
  task_id:                              z.string().transform((v) => v as TaskId),

  // TODO: confirm enum values with backend
  state:                                z.string(), // TaskStepStateEnum
  readiness_status:                     z.string(), // TaskStepReadinessStatusEnum

  sequence_order:                       z.number().int().nullable(),
  working_section_id:                   z.string().transform((v) => v as WorkingSectionId),
  assigned_worker_id:                   z.string().transform((v) => v as UserId).nullable(),
  total_dependencies:                   z.number().int(),
  completed_dependencies:               z.number().int(),
  recorded_time_marked_wrong:           z.boolean(),
  taken_from_average:                   z.boolean(),
  working_section_name_snapshot:        z.string().nullable(),
  assigned_worker_display_name_snapshot: z.string().nullable(),

  created_at:                           z.string().datetime({ offset: true }),
  closed_at:                            z.string().datetime({ offset: true }).nullable(),
  created_by_id:                        z.string().nullable(),
  updated_at:                           z.string().datetime({ offset: true }).nullable(),
  latest_state_record_id:               z.string().nullable(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// POST /api/v1/tasks/{task_id}/steps
export const CreateTaskStepInputSchema = z.object({
  task_id:            z.string().transform((v) => v as TaskId),
  working_section_id: z.string().uuid(),
  sequence_order:     z.number().int().nonnegative().optional(),
});
export type CreateTaskStepInput = z.infer<typeof CreateTaskStepInputSchema>;

// POST /api/v1/tasks/{task_id}/steps/{step_id}/assign-worker
export const AssignWorkerToStepInputSchema = z.object({
  task_id:    z.string().transform((v) => v as TaskId),
  step_id:    z.string().transform((v) => v as TaskStepId),
  worker_id:  z.string().uuid(),
});
export type AssignWorkerToStepInput = z.infer<typeof AssignWorkerToStepInputSchema>;

// POST /api/v1/tasks/{task_id}/steps/{step_id}/transition
export const TransitionStepStateInputSchema = z.object({
  task_id:    z.string().transform((v) => v as TaskId),
  step_id:    z.string().transform((v) => v as TaskStepId),
  // TODO: confirm transition payload fields with backend
});
export type TransitionStepStateInput = z.infer<typeof TransitionStepStateInputSchema>;

// POST /api/v1/tasks/{task_id}/steps/{step_id}/dependencies
export const AddStepDependencyInputSchema = z.object({
  task_id:                z.string().transform((v) => v as TaskId),
  step_id:                z.string().transform((v) => v as TaskStepId),
  prerequisite_step_id:   z.string().uuid(),
});
export type AddStepDependencyInput = z.infer<typeof AddStepDependencyInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

// Steps are listed as part of a task — always scoped by task_id.
export type ListTaskStepsParams = {
  task_id: TaskId;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type TaskStepViewModel = TaskStep & {
  state_label:           string;
  readiness_label:       string;
  is_blocked:            boolean;
  is_complete:           boolean;
  dependencies_progress: string; // "2/3"
  worker_display:        string | null;
};

export function toTaskStepViewModel(step: TaskStep): TaskStepViewModel {
  return {
    ...step,
    // TODO: replace with label maps once enum values confirmed
    state_label:           step.state,
    readiness_label:       step.readiness_status,
    is_blocked:            step.total_dependencies > 0 && step.completed_dependencies < step.total_dependencies,
    is_complete:           ['completed', 'done'].includes(step.state), // TODO confirm state values
    dependencies_progress: step.total_dependencies > 0
      ? `${step.completed_dependencies}/${step.total_dependencies}`
      : '',
    worker_display: step.assigned_worker_display_name_snapshot,
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/subfeatures/task_steps/api/task-step-keys.ts`

```ts
import type { TaskId, TaskStepId } from '@/types/common';

// Steps are always nested under a task — include taskId in every list key.
export const taskStepKeys = {
  all:     ['task-steps'] as const,
  lists:   () => [...taskStepKeys.all, 'list'] as const,
  list:    (taskId: TaskId) => [...taskStepKeys.lists(), { taskId }] as const,
  details: () => [...taskStepKeys.all, 'detail'] as const,
  detail:  (id: TaskStepId) => [...taskStepKeys.details(), id] as const,
};
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/subfeatures/task_steps/index.ts`

```ts
export type { TaskStep, TaskStepViewModel, CreateTaskStepInput } from './types';
```

---

### Step 6 — `items` feature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`

```ts
import { z } from 'zod';
import type { ItemId } from '@/types/common';

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const ITEM_CURRENCY = ['swedish_krona', 'danish_krona', 'euro'] as const;
export type ItemCurrency = typeof ITEM_CURRENCY[number];

const CURRENCY_TO_ISO: Record<ItemCurrency, string> = {
  swedish_krona: 'SEK',
  danish_krona:  'DKK',
  euro:          'EUR',
};

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const ItemSchema = z.object({
  id:                          z.string().transform((v) => v as ItemId),

  // TODO: confirm ItemStateEnum values with backend
  state:                       z.string(), // ItemStateEnum

  article_number:              z.string().nullable(),
  sku:                         z.string().nullable(),
  item_category_id:            z.string().nullable(),
  quantity:                    z.number().int(),
  designer:                    z.string().nullable(),
  height_in_cm:                z.number().int().nullable(),
  width_in_cm:                 z.number().int().nullable(),
  depth_in_cm:                 z.number().int().nullable(),
  item_value_minor:            z.number().int().nullable(),
  item_cost_minor:             z.number().int().nullable(),
  item_currency:               z.enum(ITEM_CURRENCY).nullable(),
  item_position:               z.string().nullable(),
  external_id:                 z.string().nullable(),
  external_url:                z.string().nullable(),
  external_source:             z.string().nullable(),
  external_order_id:           z.string().nullable(),
  item_category_snapshot:      z.string().nullable(),
  item_major_category_snapshot: z.string().nullable(),

  created_at:                  z.string().datetime({ offset: true }),
  created_by_id:               z.string().nullable(),
  updated_at:                  z.string().datetime({ offset: true }).nullable(),
  updated_by_id:               z.string().nullable(),
});

export type Item = z.infer<typeof ItemSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/items — create a new item
export const CreateItemInputSchema = z.object({
  client_id:          z.string().uuid(),
  article_number:     z.string().max(128).optional(),
  sku:                z.string().max(128).optional(),
  item_category_id:   z.string().uuid().optional(),
  quantity:           z.number({ invalid_type_error: 'Enter a number.' }).int().nonnegative().optional(),
  designer:           z.string().max(255).optional(),
  height_in_cm:       z.number().int().positive().optional(),
  width_in_cm:        z.number().int().positive().optional(),
  depth_in_cm:        z.number().int().positive().optional(),
  item_value_minor:   z.number().int().nonnegative().optional(),
  item_cost_minor:    z.number().int().nonnegative().optional(),
  item_currency:      z.enum(ITEM_CURRENCY, { message: 'Select a currency.' }),
  item_position:      z.string().max(255).optional(),
  external_id:        z.string().max(255).optional(),
  external_url:       z.string().url('Enter a valid URL.').optional().or(z.literal('')),
  external_source:    z.string().max(128).optional(),
  external_order_id:  z.string().max(255).optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

// PATCH /api/v1/items/{client_id} — update an item
export const UpdateItemInputSchema = z.object({
  id:               z.string().transform((v) => v as ItemId),
  article_number:   z.string().max(128).nullable().optional(),
  sku:              z.string().max(128).nullable().optional(),
  item_category_id: z.string().uuid().nullable().optional(),
  quantity:         z.number().int().nonnegative().optional(),
  designer:         z.string().max(255).nullable().optional(),
  height_in_cm:     z.number().int().positive().nullable().optional(),
  width_in_cm:      z.number().int().positive().nullable().optional(),
  depth_in_cm:      z.number().int().positive().nullable().optional(),
  item_value_minor: z.number().int().nonnegative().nullable().optional(),
  item_cost_minor:  z.number().int().nonnegative().nullable().optional(),
  item_currency:    z.enum(ITEM_CURRENCY).optional(),
  item_position:    z.string().max(255).nullable().optional(),
  external_url:     z.string().url().nullable().optional().or(z.literal('')),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListItemsParams = {
  limit?:  number;
  offset?: number;
  q?:      string; // free-text search
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type ItemViewModel = Item & {
  display_name:         string;
  dimensions_formatted: string | null;
  value_formatted:      string | null;
  cost_formatted:       string | null;
  currency_iso:         string | null;
  state_label:          string; // TODO: replace once ItemStateEnum confirmed
};

export function toItemViewModel(item: Item): ItemViewModel {
  const isoCode = item.item_currency ? CURRENCY_TO_ISO[item.item_currency] : null;

  const formatMinor = (minor: number | null): string | null => {
    if (minor === null || !isoCode) return null;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: isoCode }).format(minor / 100);
  };

  const dims = [item.height_in_cm, item.width_in_cm, item.depth_in_cm];
  const dimensionsFormatted = dims.every((d) => d !== null)
    ? `${dims[0]}×${dims[1]}×${dims[2]} cm`
    : null;

  const displayName = [item.designer, item.article_number ?? item.sku]
    .filter(Boolean)
    .join(' – ') || item.id;

  return {
    ...item,
    display_name:         displayName,
    dimensions_formatted: dimensionsFormatted,
    value_formatted:      formatMinor(item.item_value_minor),
    cost_formatted:       formatMinor(item.item_cost_minor),
    currency_iso:         isoCode,
    state_label:          item.state, // TODO: label map
  };
}

export function toOptimisticItem(input: CreateItemInput): Item {
  return ItemSchema.parse({
    id:                          input.client_id,
    state:                       'pending', // TODO: confirm initial state
    article_number:              input.article_number ?? null,
    sku:                         input.sku ?? null,
    item_category_id:            input.item_category_id ?? null,
    quantity:                    input.quantity ?? 1,
    designer:                    input.designer ?? null,
    height_in_cm:                input.height_in_cm ?? null,
    width_in_cm:                 input.width_in_cm ?? null,
    depth_in_cm:                 input.depth_in_cm ?? null,
    item_value_minor:            input.item_value_minor ?? null,
    item_cost_minor:             input.item_cost_minor ?? null,
    item_currency:               input.item_currency,
    item_position:               input.item_position ?? null,
    external_id:                 input.external_id ?? null,
    external_url:                input.external_url ?? null,
    external_source:             input.external_source ?? null,
    external_order_id:           input.external_order_id ?? null,
    item_category_snapshot:      null,
    item_major_category_snapshot: null,
    created_at:                  new Date().toISOString(),
    created_by_id:               null,
    updated_at:                  null,
    updated_by_id:               null,
  });
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/item-keys.ts`

```ts
import type { ItemId } from '@/types/common';
import type { ListItemsParams } from '@/features/items/types';

export const itemKeys = {
  all:     ['items'] as const,
  lists:   () => [...itemKeys.all, 'list'] as const,
  list:    (params: ListItemsParams = {}) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail:  (id: ItemId) => [...itemKeys.details(), id] as const,
};
```

---

### Step 7 — `item_images` subfeature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/types.ts`

```ts
import { z } from 'zod';
import type { ItemImageId, ItemId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

// Images are returned via GET /api/v1/images?entity_type=item&entity_client_id={id}
// The response includes the image data plus display_order from image_links.
export const ItemImageSchema = z.object({
  id:               z.string().transform((v) => v as ItemImageId),
  image_url:        z.string(),
  // TODO: confirm ImageSourceTypeEnum values
  source_type:      z.string(), // ImageSourceTypeEnum
  source_reference: z.string().nullable(), // ImageSourceReferenceEnum
  width_px:         z.number().int().nullable(),
  height_px:        z.number().int().nullable(),
  file_size_bytes:  z.number().int().nullable(),
  created_at:       z.string().datetime({ offset: true }),
  created_by_id:    z.string(),
  display_order:    z.number().int(), // from image_links join
});

export type ItemImage = z.infer<typeof ItemImageSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// POST /api/v1/images/upload-url — request a presigned upload URL
export const RequestItemImageUploadInputSchema = z.object({
  entity_type:      z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
  file_name:        z.string().min(1, 'File name is required.'),
  content_type:     z.string().min(1, 'Content type is required.'),
  file_size_bytes:  z.number().int().positive().optional(),
});
export type RequestItemImageUploadInput = z.infer<typeof RequestItemImageUploadInputSchema>;

// POST /api/v1/images/confirm-upload — confirm after S3 upload completes
export const ConfirmItemImageUploadInputSchema = z.object({
  pending_upload_client_id: z.string().uuid(),
  entity_type:              z.literal('item'),
  entity_client_id:         z.string().transform((v) => v as ItemId),
});
export type ConfirmItemImageUploadInput = z.infer<typeof ConfirmItemImageUploadInputSchema>;

// POST /api/v1/images/reorder — update display order
export const ReorderItemImagesInputSchema = z.object({
  entity_type:               z.literal('item'),
  entity_client_id:          z.string().transform((v) => v as ItemId),
  ordered_image_client_ids:  z.array(z.string()),
});
export type ReorderItemImagesInput = z.infer<typeof ReorderItemImagesInputSchema>;

// DELETE /api/v1/images/links — unlink an image from an item
export const UnlinkItemImageInputSchema = z.object({
  image_client_id:  z.string().transform((v) => v as ItemImageId),
  entity_type:      z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
});
export type UnlinkItemImageInput = z.infer<typeof UnlinkItemImageInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListItemImagesParams = {
  entity_type:      'item';
  entity_client_id: ItemId;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type ItemImageViewModel = ItemImage & {
  aspect_ratio:     number | null;
  size_formatted:   string | null;
};

export function toItemImageViewModel(image: ItemImage): ItemImageViewModel {
  const aspectRatio =
    image.width_px && image.height_px
      ? image.width_px / image.height_px
      : null;

  const sizeFormatted =
    image.file_size_bytes !== null
      ? image.file_size_bytes > 1_000_000
        ? `${(image.file_size_bytes / 1_000_000).toFixed(1)} MB`
        : `${Math.round(image.file_size_bytes / 1000)} KB`
      : null;

  return { ...image, aspect_ratio: aspectRatio, size_formatted: sizeFormatted };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/api/item-image-keys.ts`

```ts
import type { ItemId, ItemImageId } from '@/types/common';

// Images are always scoped to a parent entity (item in this case).
export const itemImageKeys = {
  all:     ['item-images'] as const,
  lists:   () => [...itemImageKeys.all, 'list'] as const,
  list:    (itemId: ItemId) => [...itemImageKeys.lists(), { itemId }] as const,
  details: () => [...itemImageKeys.all, 'detail'] as const,
  detail:  (id: ItemImageId) => [...itemImageKeys.details(), id] as const,
};
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/index.ts`

```ts
export type { ItemImage, ItemImageViewModel, RequestItemImageUploadInput } from './types';
```

---

### Step 8 — `customers` feature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/types.ts`

**IMPORTANT NOTE**: The backend `customers` table has only `primary_phone_number` and `primary_email` — no secondary contact fields. The previous field composition plan (`PLAN_customer_item_features_field_composition_20260520.md`) must be revised to remove `secondary_email` and `secondary_phone_number` fields before implementation.

```ts
import { z } from 'zod';
import type { CustomerId } from '@/types/common';
import { AddressSchema } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id:                   z.string().transform((v) => v as CustomerId),
  display_name:         z.string(),
  customer_type:        z.enum(['person', 'company', 'unknown']),
  status:               z.enum(['active', 'inactive']),
  primary_phone_number: z.string().nullable(),
  primary_email:        z.string().nullable(),
  address:              AddressSchema,
  created_at:           z.string().datetime({ offset: true }),
  created_by_id:        z.string().nullable(),
  updated_at:           z.string().datetime({ offset: true }).nullable(),
  updated_by_id:        z.string().nullable(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerType = Customer['customer_type'];
export type CustomerStatus = Customer['status'];

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/customers — create a new customer
export const CreateCustomerInputSchema = z.object({
  client_id:            z.string().uuid(),
  display_name:         z.string().min(1, 'Name is required.').max(255),
  customer_type:        z.enum(['person', 'company', 'unknown'], {
    message: 'Select a customer type.',
  }),
  primary_email:        z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address:              AddressSchema,
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

// PATCH /api/v1/customers/{client_id} — update a customer
// Note: backend marks customer_type and status as REQUIRED in PATCH payload.
export const UpdateCustomerInputSchema = z.object({
  id:                   z.string().transform((v) => v as CustomerId),
  customer_type:        z.enum(['person', 'company', 'unknown']),
  status:               z.enum(['active', 'inactive']),
  display_name:         z.string().min(1, 'Name is required.').max(255).optional(),
  primary_email:        z.string().email('Enter a valid email.').nullable().optional().or(z.literal('')),
  primary_phone_number: z.string().nullable().optional(),
  address:              AddressSchema,
});
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

// POST /api/v1/customers/find-or-create — upsert by contact info
export const FindOrCreateCustomerInputSchema = z.object({
  client_id:            z.string().uuid(),
  display_name:         z.string().min(1, 'Name is required.').max(255),
  customer_type:        z.enum(['person', 'company', 'unknown']),
  primary_email:        z.string().email().optional().or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address:              AddressSchema,
});
export type FindOrCreateCustomerInput = z.infer<typeof FindOrCreateCustomerInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListCustomersParams = {
  limit?:          number;
  offset?:         number;
  q?:              string; // free-text search
  string_filters?: string; // TODO: confirm format with backend
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type CustomerViewModel = Customer & {
  type_label:      string;
  status_variant:  'success' | 'muted';
  initial:         string; // first letter of display_name for avatar
  contact_display: string | null; // primary phone or email for list row
};

export function toCustomerViewModel(customer: Customer): CustomerViewModel {
  const TYPE_LABELS: Record<CustomerType, string> = {
    person:  'Person',
    company: 'Company',
    unknown: 'Unknown',
  };

  return {
    ...customer,
    type_label:     TYPE_LABELS[customer.customer_type],
    status_variant: customer.status === 'active' ? 'success' : 'muted',
    initial:        customer.display_name.charAt(0).toUpperCase(),
    contact_display: customer.primary_phone_number ?? customer.primary_email ?? null,
  };
}

export function toOptimisticCustomer(input: CreateCustomerInput): Customer {
  return CustomerSchema.parse({
    id:                   input.client_id,
    display_name:         input.display_name,
    customer_type:        input.customer_type,
    status:               'active',
    primary_phone_number: input.primary_phone_number ?? null,
    primary_email:        input.primary_email ?? null,
    address:              input.address ?? null,
    created_at:           new Date().toISOString(),
    created_by_id:        null,
    updated_at:           null,
    updated_by_id:        null,
  });
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/api/customer-keys.ts`

```ts
import type { CustomerId } from '@/types/common';
import type { ListCustomersParams } from '@/features/customers/types';

export const customerKeys = {
  all:     ['customers'] as const,
  lists:   () => [...customerKeys.all, 'list'] as const,
  list:    (params: ListCustomersParams = {}) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail:  (id: CustomerId) => [...customerKeys.details(), id] as const,
};
```

---

### Step 9 — `cases` feature: types + query keys

Replace the existing stub `src/features/cases/types.ts`.

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/types.ts`

```ts
import { z } from 'zod';
import type { CaseId, CaseConversationId, CaseParticipantId, CaseLinkId, UserId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const CaseSchema = z.object({
  id:                  z.string().transform((v) => v as CaseId),
  // TODO: confirm CaseStateEnum values with backend (e.g. 'open' | 'closed' | 'resolved')
  state:               z.string(), // CaseStateEnum
  case_type_id:        z.string().nullable(),
  type_label:          z.string().nullable(),
  participants_count:  z.number().int(),
  conversations_count: z.number().int(),
  messages_count:      z.number().int(),
  created_at:          z.string().datetime({ offset: true }),
});
export type Case = z.infer<typeof CaseSchema>;

export const CaseLinkSchema = z.object({
  id:               z.string().transform((v) => v as CaseLinkId),
  case_id:          z.string().transform((v) => v as CaseId),
  // TODO: confirm CaseLinkEntityTypeEnum and CaseLinkRoleEnum values
  entity_type:      z.string(), // CaseLinkEntityTypeEnum
  entity_client_id: z.string(),
  role:             z.string(), // CaseLinkRoleEnum
  created_at:       z.string().datetime({ offset: true }),
});
export type CaseLink = z.infer<typeof CaseLinkSchema>;

export const CaseParticipantSchema = z.object({
  id:                    z.string().transform((v) => v as CaseParticipantId),
  case_id:               z.string().transform((v) => v as CaseId),
  user_id:               z.string().transform((v) => v as UserId),
  last_read_message_seq: z.number().int(),
  joined_at:             z.string().datetime({ offset: true }),
});
export type CaseParticipant = z.infer<typeof CaseParticipantSchema>;

export const CaseConversationSummarySchema = z.object({
  id:               z.string().transform((v) => v as CaseConversationId),
  case_id:          z.string().transform((v) => v as CaseId),
  state:            z.string(), // CaseStateEnum
  last_message_seq: z.number().int(),
  messages_count:   z.number().int(),
  created_at:       z.string().datetime({ offset: true }),
});
export type CaseConversationSummary = z.infer<typeof CaseConversationSummarySchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// POST /api/v1/cases — create a new case
export const CreateCaseInputSchema = z.object({
  client_id:     z.string().uuid(),
  case_type_id:  z.string().uuid().optional(),
  type_label:    z.string().max(128).optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

// PATCH /api/v1/cases/{case_client_id}/state
export const UpdateCaseStateInputSchema = z.object({
  id:         z.string().transform((v) => v as CaseId),
  new_state:  z.string().min(1, 'State is required.'),
});
export type UpdateCaseStateInput = z.infer<typeof UpdateCaseStateInputSchema>;

// POST /api/v1/cases/{case_client_id}/links — link an entity to a case
export const LinkEntityToCaseInputSchema = z.object({
  case_id:          z.string().transform((v) => v as CaseId),
  entity_type:      z.string().min(1),
  entity_client_id: z.string().min(1),
  role:             z.string().min(1),
});
export type LinkEntityToCaseInput = z.infer<typeof LinkEntityToCaseInputSchema>;

// POST /api/v1/cases/{case_client_id}/participants
export const AddCaseParticipantsInputSchema = z.object({
  case_id:  z.string().transform((v) => v as CaseId),
  user_ids: z.array(z.string().uuid()).min(1, 'Select at least one user.'),
});
export type AddCaseParticipantsInput = z.infer<typeof AddCaseParticipantsInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListCasesParams = {
  state?:           string;
  created_by_id?:   string;
  entity_type?:     string;
  entity_client_id?: string;
  offset?:          number;
  limit?:           number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type CaseViewModel = Case & {
  state_label:  string;
  has_activity: boolean;
};

export function toCaseViewModel(c: Case): CaseViewModel {
  return {
    ...c,
    state_label:  c.state,  // TODO: label map once enum confirmed
    has_activity: c.messages_count > 0,
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`

```ts
import type { CaseId } from '@/types/common';
import type { ListCasesParams } from '@/features/cases/types';

export const caseKeys = {
  all:     ['cases'] as const,
  lists:   () => [...caseKeys.all, 'list'] as const,
  list:    (params: ListCasesParams = {}) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail:  (id: CaseId) => [...caseKeys.details(), id] as const,
};
```

---

### Step 10 — `users` feature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/users/types.ts`

```ts
import { z } from 'zod';
import type { UserId, WorkingSectionId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id:                   z.string().transform((v) => v as UserId),
  username:             z.string(),
  email:                z.string(),
  phone_number:         z.string().nullable(),
  languages:            z.string().nullable(),
  language_preference:  z.string().nullable(),
  profile_picture:      z.string().nullable(),
  online:               z.boolean(),
  last_online:          z.string().datetime({ offset: true }).nullable(),
});
export type User = z.infer<typeof UserSchema>;

// Presence record from GET /api/v1/users/live
export const LivePresenceSchema = z.object({
  user_id: z.string().transform((v) => v as UserId),
  online:  z.boolean(),
  last_online: z.string().datetime({ offset: true }).nullable(),
});
export type LivePresence = z.infer<typeof LivePresenceSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PATCH /api/v1/users/{user_client_id} — admin update
export const UpdateUserAdminInputSchema = z.object({
  id: z.string().transform((v) => v as UserId),
  // TODO: confirm which fields the admin endpoint allows editing
  username: z.string().min(1).optional(),
  email:    z.string().email().optional(),
  phone_number: z.string().nullable().optional(),
});
export type UpdateUserAdminInput = z.infer<typeof UpdateUserAdminInputSchema>;

// PATCH /api/v1/users/{user_client_id}/deactivate
export const DeactivateUserInputSchema = z.object({
  id: z.string().transform((v) => v as UserId),
});
export type DeactivateUserInput = z.infer<typeof DeactivateUserInputSchema>;

// POST /api/v1/users/{user_id}/working-sections
export const AssignWorkingSectionsInputSchema = z.object({
  user_id:             z.string().transform((v) => v as UserId),
  working_section_ids: z.array(z.string().uuid()).min(1),
});
export type AssignWorkingSectionsInput = z.infer<typeof AssignWorkingSectionsInputSchema>;

// DELETE /api/v1/users/{user_id}/working-sections
export const UnassignWorkingSectionsInputSchema = z.object({
  user_id:             z.string().transform((v) => v as UserId),
  working_section_ids: z.array(z.string().uuid()).min(1),
});
export type UnassignWorkingSectionsInput = z.infer<typeof UnassignWorkingSectionsInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListUsersParams = {
  limit?:  number;
  offset?: number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type UserViewModel = User & {
  display_name:     string;
  initial:          string;
  online_status:    'online' | 'offline' | 'away';
  has_profile_pic:  boolean;
};

export function toUserViewModel(user: User): UserViewModel {
  const now = Date.now();
  const lastOnlineMs = user.last_online ? new Date(user.last_online).getTime() : null;
  const minutesSinceActive = lastOnlineMs ? (now - lastOnlineMs) / 60_000 : null;

  const onlineStatus: UserViewModel['online_status'] = user.online
    ? 'online'
    : minutesSinceActive !== null && minutesSinceActive < 60
    ? 'away'
    : 'offline';

  return {
    ...user,
    display_name:    user.username,
    initial:         user.username.charAt(0).toUpperCase(),
    online_status:   onlineStatus,
    has_profile_pic: Boolean(user.profile_picture),
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/users/api/user-keys.ts`

```ts
import type { UserId } from '@/types/common';
import type { ListUsersParams } from '@/features/users/types';

export const userKeys = {
  all:     ['users'] as const,
  lists:   () => [...userKeys.all, 'list'] as const,
  list:    (params: ListUsersParams = {}) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail:  (id: UserId) => [...userKeys.details(), id] as const,
  live:    () => [...userKeys.all, 'live'] as const,
};
```

---

### Step 11 — `account` feature: types + query keys

The `account` feature owns the current user's self-management: profile, password, and view records. Uses the `/api/v1/users/me` endpoints.

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/account/types.ts`

```ts
import { z } from 'zod';
import type { UserId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

// GET /api/v1/users/me — current user's self profile
export const SelfProfileSchema = z.object({
  id:                  z.string().transform((v) => v as UserId),
  username:            z.string(),
  email:               z.string(),
  phone_number:        z.string().nullable(),
  languages:           z.string().nullable(),
  language_preference: z.string().nullable(),
  profile_picture:     z.string().nullable(),
  online:              z.boolean(),
  last_online:         z.string().datetime({ offset: true }).nullable(),
});
export type SelfProfile = z.infer<typeof SelfProfileSchema>;

// GET /api/v1/users/me/view-records/current
export const CurrentViewRecordSchema = z.object({
  entity_type:      z.string(),
  entity_client_id: z.string().nullable(),
  started_at:       z.string().datetime({ offset: true }),
});
export type CurrentViewRecord = z.infer<typeof CurrentViewRecordSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PATCH /api/v1/users/me
export const UpdateSelfProfileInputSchema = z.object({
  username:            z.string().min(1, 'Username is required.').optional(),
  email:               z.string().email('Enter a valid email.').optional(),
  phone_number:        z.string().nullable().optional(),
  language_preference: z.string().optional(),
});
export type UpdateSelfProfileInput = z.infer<typeof UpdateSelfProfileInputSchema>;

// PATCH /api/v1/users/me/password
export const UpdateSelfPasswordInputSchema = z.object({
  current_password: z.string().min(1, 'Current password is required.'),
  new_password:     z.string().min(8, 'Password must be at least 8 characters.'),
  confirm_password: z.string().min(1),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});
export type UpdateSelfPasswordInput = z.infer<typeof UpdateSelfPasswordInputSchema>;

// POST /api/v1/users/me/view-records — record a view event
export const RecordViewEventInputSchema = z.object({
  entity_type:      z.string().min(1),
  entity_client_id: z.string().nullable(),
});
export type RecordViewEventInput = z.infer<typeof RecordViewEventInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

// GET /api/v1/users/me/view-records
export type ListViewRecordsParams = {
  limit?:  number;
  offset?: number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type SelfProfileViewModel = SelfProfile & {
  display_name:    string;
  initial:         string;
  has_profile_pic: boolean;
};

export function toSelfProfileViewModel(profile: SelfProfile): SelfProfileViewModel {
  return {
    ...profile,
    display_name:    profile.username,
    initial:         profile.username.charAt(0).toUpperCase(),
    has_profile_pic: Boolean(profile.profile_picture),
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/account/api/account-keys.ts`

```ts
// The self profile is a singleton — no ID needed. Use a stable key.
export const accountKeys = {
  all:         ['account'] as const,
  profile:     () => [...accountKeys.all, 'profile'] as const,
  viewRecords: () => [...accountKeys.all, 'view-records'] as const,
  currentView: () => [...accountKeys.all, 'current-view'] as const,
};
```

---

### Step 12 — `working_sections` feature: types + query keys

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts`

```ts
import { z } from 'zod';
import type { WorkingSectionId, UserId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const WorkingSectionSchema = z.object({
  id:             z.string().transform((v) => v as WorkingSectionId),
  name:           z.string(),
  image:          z.string().nullable(),
  created_at:     z.string().datetime({ offset: true }),
  created_by_id:  z.string().nullable(),
  updated_at:     z.string().datetime({ offset: true }).nullable(),
  updated_by_id:  z.string().nullable(),
});
export type WorkingSection = z.infer<typeof WorkingSectionSchema>;

export const WorkingSectionMemberSchema = z.object({
  user_id:          z.string().transform((v) => v as UserId),
  working_section_id: z.string().transform((v) => v as WorkingSectionId),
  assigned_at:      z.string().datetime({ offset: true }),
  assigned_by_id:   z.string(),
  removed_at:       z.string().datetime({ offset: true }).nullable(),
  removed_by_id:    z.string().nullable(),
});
export type WorkingSectionMember = z.infer<typeof WorkingSectionMemberSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/working-sections
export const CreateWorkingSectionInputSchema = z.object({
  working_section_id: z.string().uuid(), // client-generated ID
  name:               z.string().min(1, 'Section name is required.').max(255),
  image:              z.string().optional(),
});
export type CreateWorkingSectionInput = z.infer<typeof CreateWorkingSectionInputSchema>;

// PATCH /api/v1/working-sections/{working_section_id}
export const UpdateWorkingSectionInputSchema = z.object({
  id:    z.string().transform((v) => v as WorkingSectionId),
  name:  z.string().min(1, 'Section name is required.').max(255).optional(),
  image: z.string().nullable().optional(),
});
export type UpdateWorkingSectionInput = z.infer<typeof UpdateWorkingSectionInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListWorkingSectionsParams = {
  limit?:  number;
  offset?: number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type WorkingSectionViewModel = WorkingSection & {
  has_image: boolean;
};

export function toWorkingSectionViewModel(section: WorkingSection): WorkingSectionViewModel {
  return {
    ...section,
    has_image: Boolean(section.image),
  };
}

export function toOptimisticWorkingSection(input: CreateWorkingSectionInput): WorkingSection {
  return WorkingSectionSchema.parse({
    id:            input.working_section_id,
    name:          input.name,
    image:         input.image ?? null,
    created_at:    new Date().toISOString(),
    created_by_id: null,
    updated_at:    null,
    updated_by_id: null,
  });
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/api/working-section-keys.ts`

```ts
import type { WorkingSectionId } from '@/types/common';
import type { ListWorkingSectionsParams } from '@/features/working_sections/types';

export const workingSectionKeys = {
  all:     ['working-sections'] as const,
  lists:   () => [...workingSectionKeys.all, 'list'] as const,
  list:    (params: ListWorkingSectionsParams = {}) => [...workingSectionKeys.lists(), params] as const,
  details: () => [...workingSectionKeys.all, 'detail'] as const,
  detail:  (id: WorkingSectionId) => [...workingSectionKeys.details(), id] as const,
  members: (id: WorkingSectionId) => [...workingSectionKeys.detail(id), 'members'] as const,
};
```

---

### Step 13 — `upholstery` feature: types + query keys

The `upholstery` feature owns: the fabric catalog (`upholsteries` table) and inventory management (`upholstery_inventory` table). Item upholstery assignments (`item_upholsteries`) and requirements are in the `upholstery_requirements` feature.

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/types.ts`

```ts
import { z } from 'zod';
import type { UpholsteryId, UpholsteryInventoryId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

export const UpholsterySchema = z.object({
  id:            z.string().transform((v) => v as UpholsteryId),
  name:          z.string(),
  code:          z.string().nullable(),
  created_at:    z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
  updated_at:    z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().nullable(),
});
export type Upholstery = z.infer<typeof UpholsterySchema>;

// Decimal fields from the DB (Numeric type) — serialized as strings by backend.
// Convert to number for display calculations using parseFloat().
export const UpholsteryInventorySchema = z.object({
  id:                                  z.string().transform((v) => v as UpholsteryInventoryId),
  upholstery_id:                       z.string().transform((v) => v as UpholsteryId),
  minimum_to_have:                     z.number().int().nullable(),
  maximum_to_have:                     z.number().int().nullable(),
  projected_inventory_value_minor:     z.number().int().nullable(),
  // TODO: confirm UpholsteryCurrencyEnum values (likely 'swedish_krona' | 'danish_krona' | 'euro')
  currency:                            z.string().nullable(),
  planning_position:                   z.string().nullable(),
  // TODO: confirm UpholsteryInventoryConditionEnum values
  inventory_condition:                 z.string(), // UpholsteryInventoryConditionEnum
  current_stored_amount_meters:        z.string().nullable(),  // Decimal as string
  current_amount_in_use_meters:        z.string().nullable(),
  current_amount_in_need_meters:       z.string().nullable(),
  current_amount_ordered_meters:       z.string().nullable(),
  total_upholstery_used_meters:        z.string().nullable(),
  total_upholstery_used_inventory_meters: z.string().nullable(),
  total_upholstery_used_surplus_meters: z.string().nullable(),
  total_upholstery_surplus_meters:     z.string().nullable(),
  low_stock_threshold_meters:          z.string().nullable(),
  created_at:                          z.string().datetime({ offset: true }),
  updated_at:                          z.string().datetime({ offset: true }).nullable(),
});
export type UpholsteryInventory = z.infer<typeof UpholsteryInventorySchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/upholstery-inventories
export const CreateUpholsteryInventoryInputSchema = z.object({
  client_id:         z.string().uuid(),
  upholstery_id:     z.string().uuid(),
  minimum_to_have:   z.number().int().nonnegative().optional(),
  maximum_to_have:   z.number().int().nonnegative().optional(),
  planning_position: z.string().optional(),
  currency:          z.string().optional(),
  low_stock_threshold_meters: z.string().optional(), // send as string per API contract
});
export type CreateUpholsteryInventoryInput = z.infer<typeof CreateUpholsteryInventoryInputSchema>;

// PATCH /api/v1/upholstery-inventories/{client_id}
export const UpdateUpholsteryInventoryInputSchema = z.object({
  id:                z.string().transform((v) => v as UpholsteryInventoryId),
  minimum_to_have:   z.number().int().nonnegative().nullable().optional(),
  maximum_to_have:   z.number().int().nonnegative().nullable().optional(),
  planning_position: z.string().nullable().optional(),
  currency:          z.string().nullable().optional(),
  low_stock_threshold_meters: z.string().nullable().optional(),
  projected_inventory_value_minor: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateUpholsteryInventoryInput = z.infer<typeof UpdateUpholsteryInventoryInputSchema>;

// POST /api/v1/upholstery-inventories/{client_id}/add-ordered
export const AddOrderedInventoryInputSchema = z.object({
  id:             z.string().transform((v) => v as UpholsteryInventoryId),
  amount_meters:  z.string().min(1, 'Amount is required.'), // Decimal as string
});
export type AddOrderedInventoryInput = z.infer<typeof AddOrderedInventoryInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListUpholsteryInventoriesParams = {
  limit?:  number;
  offset?: number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type UpholsteryInventoryViewModel = UpholsteryInventory & {
  stored_meters_display:  string | null;
  in_use_meters_display:  string | null;
  in_need_meters_display: string | null;
  ordered_meters_display: string | null;
  is_low_stock:           boolean;
  condition_label:        string;
};

const _metersFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1, maximumFractionDigits: 2,
});

function _formatMeters(value: string | null): string | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : `${_metersFormatter.format(num)} m`;
}

export function toUpholsteryInventoryViewModel(inv: UpholsteryInventory): UpholsteryInventoryViewModel {
  const stored = inv.current_stored_amount_meters;
  const threshold = inv.low_stock_threshold_meters;

  const isLowStock = stored !== null && threshold !== null
    ? parseFloat(stored) <= parseFloat(threshold)
    : false;

  return {
    ...inv,
    stored_meters_display:  _formatMeters(inv.current_stored_amount_meters),
    in_use_meters_display:  _formatMeters(inv.current_amount_in_use_meters),
    in_need_meters_display: _formatMeters(inv.current_amount_in_need_meters),
    ordered_meters_display: _formatMeters(inv.current_amount_ordered_meters),
    is_low_stock:           isLowStock,
    condition_label:        inv.inventory_condition, // TODO: label map
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/upholstery-keys.ts`

```ts
import type { UpholsteryId, UpholsteryInventoryId } from '@/types/common';
import type { ListUpholsteryInventoriesParams } from '@/features/upholstery/types';

export const upholsteryKeys = {
  all:        ['upholsteries'] as const,
  lists:      () => [...upholsteryKeys.all, 'list'] as const,
  list:       () => [...upholsteryKeys.lists()] as const,
  details:    () => [...upholsteryKeys.all, 'detail'] as const,
  detail:     (id: UpholsteryId) => [...upholsteryKeys.details(), id] as const,
};

export const upholsteryInventoryKeys = {
  all:     ['upholstery-inventories'] as const,
  lists:   () => [...upholsteryInventoryKeys.all, 'list'] as const,
  list:    (params: ListUpholsteryInventoriesParams = {}) =>
    [...upholsteryInventoryKeys.lists(), params] as const,
  details: () => [...upholsteryInventoryKeys.all, 'detail'] as const,
  detail:  (id: UpholsteryInventoryId) => [...upholsteryInventoryKeys.details(), id] as const,
};
```

---

### Step 14 — `upholstery_requirements` feature: types + query keys

This feature owns item upholstery assignments (`item_upholsteries`) and the individual requirements workflow (`item_upholstery_requirements`).

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery_requirements/types.ts`

```ts
import { z } from 'zod';
import type { ItemUpholsteryId, UpholsteryRequirementId, ItemId, UpholsteryId, UpholsteryInventoryId } from '@/types/common';

// ─── 1. Response DTOs ─────────────────────────────────────────────────────────

// item_upholsteries: fabric assignment to a specific item
export const ItemUpholsterySchema = z.object({
  id:                    z.string().transform((v) => v as ItemUpholsteryId),
  item_id:               z.string().transform((v) => v as ItemId),
  upholstery_id:         z.string().transform((v) => v as UpholsteryId).nullable(),
  name:                  z.string().nullable(),
  code:                  z.string().nullable(),
  amount_meters:         z.string().nullable(),  // Decimal as string
  // TODO: confirm ItemUpholsterySourceEnum values: 'internal' | 'customer' (visible in API)
  source:                z.enum(['internal', 'customer']),
  time_to_fix_in_seconds: z.number().int().nullable(),
  active_requirement_id: z.string().nullable(),
  created_at:            z.string().datetime({ offset: true }),
  created_by_id:         z.string().nullable(),
  updated_at:            z.string().datetime({ offset: true }).nullable(),
});
export type ItemUpholstery = z.infer<typeof ItemUpholsterySchema>;

// item_upholstery_requirements: a specific stock requirement record
export const UpholsteryRequirementSchema = z.object({
  id:                   z.string().transform((v) => v as UpholsteryRequirementId),
  item_upholstery_id:   z.string().transform((v) => v as ItemUpholsteryId),
  upholstery_inventory_id: z.string().transform((v) => v as UpholsteryInventoryId).nullable(),
  amount_meters:        z.string().nullable(), // Decimal as string
  value_minor:          z.number().int().nullable(),
  // TODO: confirm ItemCurrencyEnum values (same as items: 'swedish_krona' | 'danish_krona' | 'euro')
  currency:             z.string().nullable(),
  // TODO: confirm ItemUpholsteryRequirementSourceEnum and StateEnum values
  source:               z.string(), // ItemUpholsteryRequirementSourceEnum
  state:                z.string(), // ItemUpholsteryRequirementStateEnum
  created_at:           z.string().datetime({ offset: true }),
  ordered_at:           z.string().datetime({ offset: true }).nullable(),
  in_use_at:            z.string().datetime({ offset: true }).nullable(),
  completed_at:         z.string().datetime({ offset: true }).nullable(),
  failed_at:            z.string().datetime({ offset: true }).nullable(),
});
export type UpholsteryRequirement = z.infer<typeof UpholsteryRequirementSchema>;

// ─── 2. Request DTOs ──────────────────────────────────────────────────────────

// PUT /api/v1/item-upholsteries
export const CreateItemUpholsteryInputSchema = z.object({
  client_id:              z.string().uuid(),
  item_id:                z.string().uuid(),
  upholstery_id:          z.string().uuid().optional(),
  name:                   z.string().max(255).optional(),
  code:                   z.string().max(128).optional(),
  amount_meters:          z.string().optional(), // Decimal as string
  source:                 z.enum(['internal', 'customer'], { message: 'Select a source.' }),
  time_to_fix_in_seconds: z.number().int().nonnegative().optional(),
});
export type CreateItemUpholsteryInput = z.infer<typeof CreateItemUpholsteryInputSchema>;

// PATCH /api/v1/item-upholsteries/{client_id}
export const UpdateItemUpholsteryInputSchema = z.object({
  id:                     z.string().transform((v) => v as ItemUpholsteryId),
  name:                   z.string().max(255).nullable().optional(),
  code:                   z.string().max(128).nullable().optional(),
  amount_meters:          z.string().nullable().optional(),
  time_to_fix_in_seconds: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateItemUpholsteryInput = z.infer<typeof UpdateItemUpholsteryInputSchema>;

// POST /api/v1/item-upholsteries/mark-ordered
export const MarkUpholsteryOrderedInputSchema = z.object({
  upholstery_id:                 z.string().uuid(),
  ordered_quantity:              z.string().min(1, 'Enter a quantity.'),
  priority_item_upholstery_ids:  z.array(z.string().uuid()).optional(),
});
export type MarkUpholsteryOrderedInput = z.infer<typeof MarkUpholsteryOrderedInputSchema>;

// POST /api/v1/upholstery-requirements/{client_id}/complete
export const CompleteRequirementInputSchema = z.object({
  id: z.string().transform((v) => v as UpholsteryRequirementId),
});
export type CompleteRequirementInput = z.infer<typeof CompleteRequirementInputSchema>;

// ─── 3. Query Params DTOs ─────────────────────────────────────────────────────

export type ListItemUpholsteriesParams = {
  limit?:  number;
  offset?: number;
};

export type ListRequirementsParams = {
  item_upholstery_id: ItemUpholsteryId;
  limit?:             number;
  offset?:            number;
};

// ─── 4. View Models ───────────────────────────────────────────────────────────

export type ItemUpholsteryViewModel = ItemUpholstery & {
  display_name:          string;
  amount_meters_display: string | null;
  state_label:           string; // derived from active_requirement_id presence
  source_label:          string;
};

export function toItemUpholsteryViewModel(iu: ItemUpholstery): ItemUpholsteryViewModel {
  const amountNum = iu.amount_meters ? parseFloat(iu.amount_meters) : null;

  return {
    ...iu,
    display_name: iu.name ?? iu.code ?? iu.id,
    amount_meters_display: amountNum !== null && !isNaN(amountNum)
      ? `${amountNum.toFixed(2)} m`
      : null,
    state_label:  iu.active_requirement_id ? 'In progress' : 'No active requirement',
    source_label: iu.source === 'internal' ? 'Internal stock' : 'Customer supplied',
  };
}

export type UpholsteryRequirementViewModel = UpholsteryRequirement & {
  state_label:           string;
  amount_meters_display: string | null;
};

export function toUpholsteryRequirementViewModel(req: UpholsteryRequirement): UpholsteryRequirementViewModel {
  const amountNum = req.amount_meters ? parseFloat(req.amount_meters) : null;

  return {
    ...req,
    state_label: req.state, // TODO: label map once enum confirmed
    amount_meters_display: amountNum !== null && !isNaN(amountNum)
      ? `${amountNum.toFixed(2)} m`
      : null,
  };
}
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery_requirements/api/upholstery-requirement-keys.ts`

```ts
import type { ItemUpholsteryId, UpholsteryRequirementId } from '@/types/common';
import type { ListItemUpholsteriesParams } from '@/features/upholstery_requirements/types';

export const itemUpholsteryKeys = {
  all:     ['item-upholsteries'] as const,
  lists:   () => [...itemUpholsteryKeys.all, 'list'] as const,
  list:    (params: ListItemUpholsteriesParams = {}) => [...itemUpholsteryKeys.lists(), params] as const,
  details: () => [...itemUpholsteryKeys.all, 'detail'] as const,
  detail:  (id: ItemUpholsteryId) => [...itemUpholsteryKeys.details(), id] as const,
  requirements: (id: ItemUpholsteryId) => [...itemUpholsteryKeys.detail(id), 'requirements'] as const,
};

export const upholsteryRequirementKeys = {
  all:     ['upholstery-requirements'] as const,
  details: () => [...upholsteryRequirementKeys.all, 'detail'] as const,
  detail:  (id: UpholsteryRequirementId) => [...upholsteryRequirementKeys.details(), id] as const,
};
```

---

### Step 15 — Configuration feature stubs

These features do not yet have finalized schemas. Create minimal stubs that satisfy TypeScript and reserve the namespace.

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items_configuration/types.ts`

```ts
import { z } from 'zod';

// Placeholder — full schema to be defined when items_configuration is implemented.
// Will cover: item_categories, issue_types, issue_severities, issue_category_configs.

export const ItemCategorySchema = z.object({
  id:            z.string(),
  name:          z.string(),
  major_category: z.string(), // ItemMajorCategoryEnum — confirm values
  created_at:    z.string().datetime({ offset: true }),
});
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const IssueSeveritySchema = z.object({
  id:               z.string(),
  name:             z.string(),
  time_multiplier:  z.string(), // Decimal as string
  created_at:       z.string().datetime({ offset: true }),
});
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const IssueTypeSchema = z.object({
  id:         z.string(),
  name:       z.string(),
  source:     z.string(), // IssueSourceEnum
  created_at: z.string().datetime({ offset: true }),
});
export type IssueType = z.infer<typeof IssueTypeSchema>;
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items_configuration/index.ts`

```ts
export type { ItemCategory, IssueSeverity, IssueType } from './types';
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections_configuration/types.ts`

```ts
// Placeholder — full schema to be defined when working_sections_configuration is implemented.
// Will cover: working_section_supported_issue_types, working_section_item_categories,
//             working_section_dependencies.

export type WorkingSectionConfig = {
  working_section_id:     string;
  supported_issue_types:  string[];
  item_category_ids:      string[];
};
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections_configuration/index.ts`

```ts
export type { WorkingSectionConfig } from './types';
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/static_costs_configuration/types.ts`

```ts
import { z } from 'zod';

// Placeholder — full schema to be defined when static_costs_configuration is implemented.

export const StaticCostSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  description: z.string().nullable(),
  cost_minor:  z.number().int(),
  currency:    z.string(), // StaticCostCurrencyEnum
  created_at:  z.string().datetime({ offset: true }),
});
export type StaticCost = z.infer<typeof StaticCostSchema>;
```

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/static_costs_configuration/index.ts`

```ts
export type { StaticCost } from './types';
```

---

### Step 16 — Update `index.ts` public APIs for operational features

Each operational feature's `index.ts` exports its types. Existing entries in each `index.ts` (providers, components, route entries) must be preserved — only add type exports.

**`src/features/tasks/index.ts`** (augment existing):
```ts
// Type exports — add below any existing exports
export type {
  Task, TaskViewModel, CreateTaskInput, UpdateTaskInput,
  CancelTaskInput, ResolveTaskInput, FailTaskInput,
  AddItemToTaskInput, CreateTaskNoteInput, ListTasksParams,
} from './types';
```

**`src/features/items/index.ts`** (create or augment):
```ts
export type { Item, ItemViewModel, CreateItemInput, UpdateItemInput, ListItemsParams } from './types';
```

**`src/features/customers/index.ts`** (create or augment):
```ts
export type { Customer, CustomerViewModel, CreateCustomerInput, UpdateCustomerInput, ListCustomersParams } from './types';
```

**`src/features/cases/index.ts`** (augment existing):
```ts
// Add below any existing exports:
export type { Case, CaseViewModel, CaseLink, CaseParticipant, CreateCaseInput, ListCasesParams } from './types';
```

**`src/features/users/index.ts`** (create or augment):
```ts
export type { User, UserViewModel, ListUsersParams } from './types';
```

**`src/features/account/index.ts`** (create or augment):
```ts
export type { SelfProfile, SelfProfileViewModel, UpdateSelfProfileInput } from './types';
```

**`src/features/working_sections/index.ts`** (create or augment):
```ts
export type { WorkingSection, WorkingSectionViewModel, CreateWorkingSectionInput } from './types';
```

**`src/features/upholstery/index.ts`** (create or augment):
```ts
export type { Upholstery, UpholsteryInventory, UpholsteryInventoryViewModel } from './types';
```

**`src/features/upholstery_requirements/index.ts`** (create or augment):
```ts
export type { ItemUpholstery, ItemUpholsteryViewModel, UpholsteryRequirement, CreateItemUpholsteryInput } from './types';
```

---

### Step 17 — Cross-reference: update `PLAN_customer_item_features_field_composition_20260520.md`

Add a note in the clarifications section of the field composition plan:

> "Customer `secondary_email` and `secondary_phone_number` fields confirmed absent from backend API and database. Remove these fields from `CustomerFieldsSchema`, `CustomerSecondaryEmailField`, and `CustomerSecondaryPhoneField`. See `PLAN_feature_domain_architecture_20260520.md` Step 8 for canonical customer schema."

---

### Step 18 — Typecheck

```
npm run typecheck
```

Expected: zero TypeScript errors. Resolve any import issues before marking complete.

---

## Risks and mitigations

- Risk: Enum placeholder values (`z.string()`) will not catch typos at parse time.
  Mitigation: Each placeholder has a `// TODO: confirm enum values` comment. A follow-up plan will sweep all `z.string()` placeholders and replace with `z.enum([...])` once backend enum values are confirmed. The architecture is not blocked — the type system provides the shape guarantee; enum correctness is a separate step.

- Risk: Backend `data` field shape per endpoint is unknown — the README shows `data: any` for all 200 responses.
  Mitigation: This plan defines entity schemas (the inner shape). API functions (implemented in the next plan) will define per-endpoint response envelope schemas that unwrap `{ ok, data, warnings }`. No API function code is written here.

- Risk: Decimal/Numeric DB fields serialized as strings may actually come as floats in some endpoints.
  Mitigation: Use `z.union([z.string(), z.number()]).transform(String)` in the API function's response schema if `z.string()` fails at parse time. The view model always calls `parseFloat()` before display operations, so either format works downstream.

- Risk: `src/features/tasks/types.ts` stub is replaced entirely — any imports of `TasksState` from the old stub will break.
  Mitigation: Confirmed one consumer: `controllers/use-tasks-view.controller.ts` re-exports `TasksState` as `TasksViewController`. Step 4 pre-condition patches this file to inline `Record<string, never>` directly before `types.ts` is replaced.

- Risk: Configuration feature stubs use `z.string()` for all ID fields (not branded). A later plan will need to add proper branded IDs once configuration features are built.
  Mitigation: Stubs are clearly marked as placeholders. The operational feature branded IDs in `common.ts` are correct and complete.

- Risk: Subfeature `task_steps` query key includes `taskId` in the list key. If task steps are cached without knowing the parent task, stale data may remain across tasks.
  Mitigation: The list key scopes by `{ taskId }`, so each task's steps are independently cached and invalidated. Never list steps without a `taskId` — the `ListTaskStepsParams` type enforces this by requiring `task_id`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all new and modified files
- Manual check: `grep -r "from.*features.*/" src/features/` — no deep cross-feature imports (only `from '@/features/<x>/index'` or `from '@/features/<x>'`)
- Manual check: each `types.ts` file has all four DTO sections in order (Response → Request → QueryParams → ViewModels)
- Manual check: each `api/*-keys.ts` has the five-key shape (`all`, `lists()`, `list(params)`, `details()`, `detail(id)`)

## Review log

- `2026-05-20` `claude-sonnet-4-6`: Initial plan created

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`

---

## Architecture decision notes (for implementer)

### Why the address is loose (`z.record` / `.passthrough()`)

The `address` JSON column has no enforced DB schema. The plan uses `AddressSchema` with known sub-fields (street, city, postal_code, country) but `.passthrough()` so any additional backend-side fields are not stripped. When the address structure is finalized with the backend team, replace `.passthrough()` with `.strict()`.

### Why Decimal/Numeric fields use strings

FastAPI with asyncpg typically serializes `Numeric` columns as strings to avoid floating-point precision loss (Python's `decimal.Decimal` → JSON string). The `.nullable()` `z.string()` approach is safe: if the backend sends a float instead, use `z.union([z.string(), z.number()]).transform(String)` in the API function's response schema.

### Why `upholstery` and `upholstery_requirements` are two features, not one

The upholstery catalog + inventory management is operational but administrative (configuring stock levels, ordering fabric). Item upholstery assignments + requirements are the day-to-day operational workflow (assigning fabric to items, tracking what needs to be ordered for active jobs). Separating them follows the "one noun per feature" rule from `15_feature_structure.md` and keeps the operational workflow domain isolated from catalog management.

### Subfeature ownership vs. top-level feature

`task_steps` and `item_images` are subfeatures (not top-level features) because:
- They are never accessed without knowing their parent (`task_id` / `item_id`)
- They have no standalone route or page
- Their lifecycle is entirely owned by the parent entity

If they were promoted to top-level features, cross-feature imports would be required (steps importing task types), violating the `index.ts` boundary rule.

### Query key scoping

For this app, queries are always scoped to one workspace per session. Workspace ID is not included in query keys because `queryClient.clear()` runs on sign-out and workspace switch (per `05_server_state.md`). If multi-workspace sessions are introduced, all key factories here must be updated to include `workspaceId` as the first scope element.
