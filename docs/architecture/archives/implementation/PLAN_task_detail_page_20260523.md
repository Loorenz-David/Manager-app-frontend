# PLAN_task_detail_page_20260523

## Metadata

- Plan ID: `PLAN_task_detail_page_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T14:16:04Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Implement the full task detail slide page — replacing the stub in `pages/tasks/TaskDetailSlidePage.tsx` — including a live detail query, all body sections (customer, issues, schedule, images, upholstery, flow timeline), inline micro-edit bottom sheets, a header menu sheet (delete + resolve), and a `ConfirmActionButton` primitive.
- **Business/user intent:** Managers need a single page that gives them a complete, at-a-glance view of a task with quick-edit actions for the most common changes (schedule, quantity, upholstery amount) without navigating to a full edit form.
- **Non-goals:**
  - Full edit mode (task creation forms in edit-mode with pre-fill) — deferred to `PLAN_task_edit_mode_*`; this plan registers a stub `TaskEditSlidePage`.
  - Flow record detail bottom sheet body — stub only (tap opens sheet, content is "coming soon").
  - Issue-picker sheet (add new issue) — reuses existing `ItemFastIssueSheetPage` surface from the items feature.
  - Upholstery picker navigation — reuses existing `UpholsteryPickerSlidePage` via the updated `ItemUpholsteryField`.

## Scope

- In scope:
  - **Primitive moves/additions:** Move `FormFieldContainer` to `components/primitives/`; add `DashedInfoSection` primitive; add `ConfirmActionButton` primitive.
  - **`ItemUpholsteryField` extension:** Add optional `requirementState` prop to render a requirement state pill inside the existing field.
  - **Types:** `TaskNote`, `TaskFlowRecord`, `TaskDetailRaw` schemas in `tasks/types.ts`; `ItemUpholsteryRequirement` schema in `items/types.ts`.
  - **API layer:** Update `get-task.ts` (typed schemas); new `use-get-task-query.ts`; new flow-records API + query hook; new mutation API fns for tasks, items, and item upholstery.
  - **Actions:** `use-update-task`, `use-delete-task`, `use-resolve-task` (tasks); `use-update-item`, `use-create-item-issue`, `use-delete-item-issue`, `use-set-upholstery-quantity` (items).
  - **Flow + controller + provider:** `use-task-detail.flow.ts`, `use-task-detail.controller.ts`, `TaskDetailProvider.tsx`.
  - **Components (under `features/tasks/components/detail/`):** `TaskDetailHeader`, `TaskCustomerSection`, `TaskIssuesSection`, `TaskScheduledDeliverySection`, `TaskImagesSection`, `TaskUpholsterySection`, `TaskFlowTimeline`, `TaskDetailBottomActions`.
  - **Pages:** `TaskDetailMenuSheetPage`, `TaskScheduledDateSheetPage`, `ItemQuantitySheetPage`, `ItemUpholsteryAmountSheetPage`, `TaskFlowRecordDetailSheetPage` (stub), `TaskEditSlidePage` (stub); replaced `TaskDetailSlidePage`.
  - **Surface registrations + public API:** `tasks/surfaces.ts`, `app/surface-registry.ts`, `tasks/index.ts`, `items/index.ts`, `components/primitives/index.ts`.

- Out of scope:
  - Full edit mode form pre-fill
  - Task note CRUD
  - Real-time socket updates (handled by existing realtime layer; query invalidation is sufficient)

- Assumptions:
  - `animate-image-edit-shake` animation keyframes already exist in `src/index.css`.
  - `ItemFastIssueSheetPage` surface ID is already exported from `features/items/surfaces.ts` and registered.
  - `UPHOLSTERY_PICKER_SLIDE_SURFACE_ID` is already exported from `features/upholstery/surfaces.ts` and registered.
  - `StatePill` primitive (created in `PLAN_task_list_card_20260523`) is already in `components/primitives/`.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query hook structure, `useQuery` / `useInfiniteQuery`, query key factory
- `architecture/06_client_state.md`: Zustand store shape, `getState()` mutations
- `architecture/08_hooks.md`: action hook pattern (cache snapshot, rollback, optimistic update, invalidation)
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.get/post/patch/delete`, error envelope
- `architecture/07_components.md`: feature component rules (context-only, no logic layer imports)
- `architecture/23_providers.md`: context provider shell
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: slide/sheet surface types, `useSurface`, `useSurfaceProps`
- `architecture/31_animations.md`: framer-motion patterns, `AnimatePresence`, CSS keyframes
- `architecture/15_feature_structure.md` + `15_feature_structure_local.md`: feature folder conventions
- `architecture/24_dto.md`: view model transformer conventions

### File read intent — pattern vs. relational

Permitted reads taken during plan authoring:
- `features/tasks/types.ts` — established actual field names, enums, existing schemas
- `features/tasks/api/get-task.ts` — confirmed opaque schema, client_id field names in response
- `features/tasks/api/task-keys.ts` — confirmed `taskKeys.detail(id)` exists
- `features/tasks/surfaces.ts` — confirmed existing surface IDs
- `features/tasks/subfeatures/task_steps/types.ts` — confirmed `TaskStep` schema
- `features/items/types.ts` — confirmed `ItemIssue`, `ItemUpholstery` schemas and field names
- `features/upholstery/types.ts` — confirmed `Upholstery` schema
- `features/items/components/fields/ItemUpholsteryField.tsx` — confirmed existing prop surface, interaction pattern
- `features/task-creation/components/FormFieldContainer.tsx` — confirmed component shape to move
- `features/images/index.ts` — confirmed `EntityImagesProvider` and `ImagePreviewGrid` are already exported
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_tasks_items_upholstery_images_contracts_20260523.md` — established all endpoint shapes

---

## Implementation plan

---

### Phase A — Primitive moves and additions

---

#### Step 1 — Move `FormFieldContainer` to `components/primitives/`

**Why:** `FormFieldContainer` lives in `features/task-creation/components/`. The task detail page is a different feature and cannot import it from there without violating the feature-boundary rule. Moving it to `components/primitives/` makes it shared and keeps all callers compliant.

**New file: `components/primitives/form-field-container/FormFieldContainer.tsx`**

```tsx
type FormFieldContainerProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function FormFieldContainer({
  children,
  'data-testid': testId,
}: FormFieldContainerProps): React.JSX.Element {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-xl bg-[var(--color-card)] px-4 py-4 shadow-sm"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
```

**New file: `components/primitives/form-field-container/index.ts`**

```ts
export { FormFieldContainer } from './FormFieldContainer';
export type { } from './FormFieldContainer'; // no extra types needed
```

**Edit `features/task-creation/components/ReturnFormContent.tsx`:** Replace `import { FormFieldContainer } from './FormFieldContainer'` with `import { FormFieldContainer } from '@/components/primitives'`.

**Edit `features/task-creation/components/PreOrderFormContent.tsx`:** Replace `import { FormFieldContainer } from './FormFieldContainer'` with `import { FormFieldContainer } from '@/components/primitives'`.

**Edit `features/task-creation/components/InternalFormContent.tsx`:** Replace `import { FormFieldContainer } from './FormFieldContainer'` with `import { FormFieldContainer } from '@/components/primitives'`.

**Delete** `features/task-creation/components/FormFieldContainer.tsx`.

**Edit `components/primitives/index.ts`:** Add at end:
```ts
export { FormFieldContainer } from './form-field-container';
```

---

#### Step 2 — Add `DashedInfoSection` primitive

Used for the grouped containers inside the task detail body (customer info, issues, schedule, upholstery). Each section has a dashed border, `--color-border` at 30% opacity background, and rounded corners. Sections are stacked with zero vertical gap between them in the assembly view (Step 32); each section retains its own `rounded-xl` corners — no unified border grouping treatment is applied.

**New file: `components/primitives/dashed-info-section/DashedInfoSection.tsx`**

```tsx
import { cn } from '@/lib/utils';

export type DashedInfoSectionProps = {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

export function DashedInfoSection({
  children,
  className,
  'data-testid': testId,
}: DashedInfoSectionProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3 rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-border)]/30 px-4 py-4',
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
```

**New file: `components/primitives/dashed-info-section/index.ts`**

```ts
export { DashedInfoSection } from './DashedInfoSection';
export type { DashedInfoSectionProps } from './DashedInfoSection';
```

**Edit `components/primitives/index.ts`:** Add:
```ts
export { DashedInfoSection } from './dashed-info-section';
export type { DashedInfoSectionProps } from './dashed-info-section';
```

---

#### Step 3 — Add `ConfirmActionButton` primitive

A button that requires a second tap to confirm. On first tap: changes label to the confirm text and starts a timed fill animation (right-to-left color sweep using a CSS `width` transition). The fill color sweeps behind the text, changing the text color via `mix-blend-mode` or a clipped overlay. On fill completion (timer expires): reverts to initial state. On confirm-tap (second tap before timer): calls `onConfirm`. Fully customizable labels and colors.

**New file: `components/primitives/confirm-action-button/ConfirmActionButton.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type ConfirmActionButtonProps = {
  label: string;
  confirmLabel: string;
  confirmDurationMs?: number;
  fillColor?: string;
  textColor?: string;
  confirmTextColor?: string;
  className?: string;
  onConfirm: () => void;
  disabled?: boolean;
  'data-testid'?: string;
};

export function ConfirmActionButton({
  label,
  confirmLabel,
  confirmDurationMs = 3000,
  fillColor = 'var(--color-destructive)',
  textColor,
  confirmTextColor = 'white',
  className,
  onConfirm,
  disabled = false,
  'data-testid': testId,
}: ConfirmActionButtonProps): React.JSX.Element {
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPending(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (!isPending) {
      setIsPending(true);
      timerRef.current = window.setTimeout(reset, confirmDurationMs);
      return;
    }
    reset();
    onConfirm();
  }, [confirmDurationMs, disabled, isPending, onConfirm, reset]);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-xl px-4 py-3 text-sm font-medium transition-colors',
        className,
      )}
      data-testid={testId}
      disabled={disabled}
      style={isPending ? { color: confirmTextColor } : { color: textColor }}
      type="button"
      onClick={handleClick}
    >
      {/* Fill sweep — keyframe animates width from 0% to 100%; forwards fill-mode holds it at 100% */}
      {isPending ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-xl"
          style={{
            backgroundColor: fillColor,
            animation: `confirm-fill ${confirmDurationMs}ms linear forwards`,
          }}
        />
      ) : null}
      <span className="relative">{isPending ? confirmLabel : label}</span>
    </button>
  );
}
```

The fill animation keyframe must be added to `src/index.css`:

```css
@keyframes confirm-fill {
  from { width: 0%; }
  to   { width: 100%; }
}
```

**New file: `components/primitives/confirm-action-button/index.ts`**

```ts
export { ConfirmActionButton } from './ConfirmActionButton';
export type { ConfirmActionButtonProps } from './ConfirmActionButton';
```

**Edit `components/primitives/index.ts`:** Add:
```ts
export { ConfirmActionButton } from './confirm-action-button';
export type { ConfirmActionButtonProps } from './confirm-action-button';
```

---

### Phase B — Type definitions

---

#### Step 4 — Add `TaskNote`, `TaskFlowRecord`, `TaskDetailRaw` to `tasks/types.ts`

Add the following after the existing `CreateTaskNoteInputSchema`:

```ts
// ─── Task note ────────────────────────────────────────────────────────────────

export const TaskNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  note_type: z.enum(TASK_NOTE_TYPE),
  content: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});
export type TaskNote = z.infer<typeof TaskNoteSchema>;

// ─── Task flow record ─────────────────────────────────────────────────────────

export const TaskFlowRecordCreatedBySchema = z
  .object({
    client_id: z.string(),
    username: z.string(),
    profile_picture: z.string().nullable(),
  })
  .nullable();

export const TaskFlowRecordSchema = z.object({
  type: z.string(),
  entity_type: z.string(),
  entity_client_id: z.string(),
  description: z.string(),
  created_at: z.string().datetime({ offset: true }),
  created_by: TaskFlowRecordCreatedBySchema,
});
export type TaskFlowRecord = z.infer<typeof TaskFlowRecordSchema>;

export type TaskFlowRecordCreatedBy = NonNullable<z.infer<typeof TaskFlowRecordCreatedBySchema>>;

// ─── Task detail raw (full GET /api/v1/tasks/{id} response) ───────────────────

// The detail response sends entity ids as `client_id`, matching `ItemIssueSchema`
// and `ItemUpholsterySchema` which already use `client_id`.
// `task` and `item` use a flat raw shape here to avoid the TaskSchema id-transform mismatch.

export const TaskDetailTaskRawSchema = z.object({
  client_id: z.string(),
  task_scalar_id: z.number().int(),
  task_type: z.enum(TASK_TYPE),
  priority: z.enum(TASK_PRIORITY),
  state: z.enum(TASK_STATE),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
  item_location: z.enum(TASK_ITEM_LOCATION).nullable(),
  return_method: z.enum(TASK_RETURN_METHOD).nullable(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable(),
  additional_details: z.record(z.string(), z.unknown()).nullable(),
  ready_by_at: z.string().nullable(),
  scheduled_start_at: z.string().nullable(),
  scheduled_end_at: z.string().nullable(),
  customer_id: z.string().nullable(),
  primary_phone_number: z.string().nullable(),
  secondary_phone_number: z.string().nullable(),
  primary_email: z.string().nullable(),
  secondary_email: z.string().nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  closed_at: z.string().datetime({ offset: true }).nullable(),
});
export type TaskDetailTaskRaw = z.infer<typeof TaskDetailTaskRawSchema>;

export const TaskDetailItemRawSchema = z
  .object({
    client_id: z.string(),
    article_number: z.string().nullable(),
    sku: z.string().nullable(),
    state: z.string(),
    item_category_id: z.string().nullable(),
    quantity: z.number().int(),
    designer: z.string().nullable(),
    height_in_cm: z.number().int().nullable(),
    width_in_cm: z.number().int().nullable(),
    depth_in_cm: z.number().int().nullable(),
    item_value_minor: z.number().int().nullable(),
    item_cost_minor: z.number().int().nullable(),
    item_currency: z.string().nullable(),
    item_position: z.string().nullable(),
    item_category_snapshot: z.string().nullable(),
    item_major_category_snapshot: z.string().nullable(),
  })
  .nullable();
export type TaskDetailItemRaw = z.infer<typeof TaskDetailItemRawSchema>;
```

Also add view-model helper types (used in the flow):

```ts
export type TaskDetailViewModel = {
  taskId: string;
  task: TaskDetailTaskRaw;
  item: TaskDetailItemRaw;
  articleLabel: string;
  categoryLabel: string | null;
  stateVariant: import('@/components/primitives').StatePillVariant;
  daysLeft: number | null;
  showDaysLeftPill: boolean;
  urgentDaysLeft: boolean;
  scheduleWeekLabel: string | null;
  readyByFormatted: string | null;
  scheduledStartFormatted: string | null;
  scheduledEndFormatted: string | null;
  showCustomerSection: boolean;
  customerName: string | null;
  fulfillmentMethodLabel: string | null;
};
```

---

#### Step 5 — Add `ItemUpholsteryRequirement` to `items/types.ts`

Add after the `ItemUpholsterySchema` block:

```ts
export const ITEM_UPHOLSTERY_REQUIREMENT_STATE = [
  'available',
  'ordered',
  'in_use',
  'completed',
  'failed',
] as const;
export type ItemUpholsteryRequirementState = (typeof ITEM_UPHOLSTERY_REQUIREMENT_STATE)[number];

export const ItemUpholsteryRequirementSchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string(),
  upholstery_inventory_id: z.string().nullable(),
  amount_meters: z.string(),
  source: z.string(),
  state: z.enum(ITEM_UPHOLSTERY_REQUIREMENT_STATE),
  value_minor: z.number().int().nullable(),
  currency: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  is_deleted: z.boolean(),
});
export type ItemUpholsteryRequirement = z.infer<typeof ItemUpholsteryRequirementSchema>;
```

---

#### Step 6 — Extend `ItemUpholsteryField` with `requirementState` prop

**Edit `features/items/components/fields/ItemUpholsteryField.tsx`:**

Add to `ItemUpholsteryFieldProps`:
```ts
requirementState?: import('@/features/items/types').ItemUpholsteryRequirementState | null;
```

In the rendered label area, when `requirementState` is non-null, render a `StatePill` beside the upholstery name using the mapping:

```ts
const REQUIREMENT_STATE_VARIANT: Record<ItemUpholsteryRequirementState, StatePillVariant> = {
  available: 'success',
  ordered: 'active',
  in_use: 'active',
  completed: 'success',
  failed: 'danger',
};
```

The pill renders only when `requirementState != null` and is placed inline beside the name text.

---

### Phase C — API layer

---

#### Step 7 — Update `tasks/api/get-task.ts` to typed schema

Replace the opaque `z.record(...)` shapes with the new schemas from Step 4 and Step 5:

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { ItemIssueSchema, ItemUpholsterySchema, ItemUpholsteryRequirementSchema } from '@/features/items/types';
import {
  TaskDetailTaskRawSchema,
  TaskDetailItemRawSchema,
  TaskNoteSchema,
  TaskFlowRecordSchema,
  ImageLightSchema,
} from '../types';

const GetTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    task: TaskDetailTaskRawSchema,
    item: TaskDetailItemRawSchema,
    item_images: z.array(ImageLightSchema),
    item_issues: z.array(ItemIssueSchema),
    item_upholstery: z.array(ItemUpholsterySchema),
    requirements: z.array(ItemUpholsteryRequirementSchema),
    task_steps: z.array(z.record(z.string(), z.unknown())),  // opaque — detail API sends client_id not id; TaskStepSchema transforms would fail
    task_notes: z.array(TaskNoteSchema),
    unread_message_count: z.number().int(),
  }),
).extend({ ok: z.literal(true) });

export type GetTaskResult = z.infer<typeof GetTaskResponseSchema>['data'];

export async function getTask(taskId: string): Promise<GetTaskResult> {
  const parsed = await apiClient.get(`/api/v1/tasks/${taskId}`, GetTaskResponseSchema);
  return parsed.data;
}
```

Note: `task_steps` is kept opaque (`z.record`) because the detail API sends `client_id` but `TaskStepSchema` has an `id` transform — using `.partial()` would still fail since the field names differ. Task step data in the flow timeline comes from `task_flow_records`, not `task_steps`.

---

#### Step 8 — Create `tasks/api/use-get-task-query.ts`

```ts
import { useQuery } from '@tanstack/react-query';

import { getTask } from './get-task';
import { taskKeys } from './task-keys';

export function useGetTaskQuery(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId as import('@/types/common').TaskId),
    queryFn: () => getTask(taskId),
  });
}
```

---

#### Step 9 — Create flow-records API + query hook

**New file: `tasks/api/get-task-flow-records.ts`**

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { TaskFlowRecordSchema } from '../types';

const PAGE_LIMIT = 10;

const GetTaskFlowRecordsResponseSchema = ApiEnvelopeSchema(
  z.object({
    flow_records: z.array(TaskFlowRecordSchema),
    flow_records_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type GetTaskFlowRecordsResult = z.infer<typeof GetTaskFlowRecordsResponseSchema>['data'];

export async function getTaskFlowRecords(
  taskId: string,
  offset: number,
): Promise<GetTaskFlowRecordsResult> {
  const parsed = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records`,
    GetTaskFlowRecordsResponseSchema,
    { offset },
  );
  return parsed.data;
}

export { PAGE_LIMIT as FLOW_RECORDS_PAGE_LIMIT };
```

**New file: `tasks/api/use-get-task-flow-records-query.ts`**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';

import { FLOW_RECORDS_PAGE_LIMIT, getTaskFlowRecords } from './get-task-flow-records';
import { taskKeys } from './task-keys';

export function useGetTaskFlowRecordsQuery(taskId: string) {
  return useInfiniteQuery({
    queryKey: taskKeys.flowRecords(taskId as import('@/types/common').TaskId),
    queryFn: ({ pageParam }) => getTaskFlowRecords(taskId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.flow_records_pagination.has_more
        ? lastPage.flow_records_pagination.offset + FLOW_RECORDS_PAGE_LIMIT
        : undefined,
  });
}
```

**Edit `tasks/api/task-keys.ts`:** Add:
```ts
flowRecords: (id: TaskId) => [...taskKeys.detail(id), 'flow-records'] as const,
```

---

#### Step 10 — Create task mutation API functions

**New file: `tasks/api/update-task.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';
import type { UpdateTaskInput } from '../types';

const UpdateTaskResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const { id, ...body } = input;
  await apiClient.patch(`/api/v1/tasks/${id}`, UpdateTaskResponseSchema, body);
}
```

**New file: `tasks/api/delete-task.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

// NOTE: verify the delete endpoint's HTTP status with the backend handoff doc.
// If it returns 204 (no body), use: z.object({}).passthrough() instead of ApiEnvelopeSchema.
// If it returns 200 with { ok: true, data: { client_id } }, the schema below is correct.
const DeleteTaskResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tasks/${taskId}`, DeleteTaskResponseSchema);
}
```

**New file: `tasks/api/resolve-task.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

const ResolveTaskResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export async function resolveTask(taskId: string): Promise<void> {
  await apiClient.post(`/api/v1/tasks/${taskId}/resolve`, ResolveTaskResponseSchema, {});
}
```

---

#### Step 11 — Create item mutation API functions

**New file: `items/api/update-item.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';
import type { UpdateItemInput } from '../types';

const UpdateItemResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export async function updateItem(input: UpdateItemInput): Promise<void> {
  const { id, ...body } = input;
  await apiClient.patch(`/api/v1/items/${id}`, UpdateItemResponseSchema, body);
}
```

**New file: `items/api/create-item-issue.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

export type CreateItemIssueBody = {
  issue_type_id: string;
  issue_severity_id: string;
  base_time_seconds: number;
  time_multiplier: number;
  issue_name_snapshot: string;
  severity_name_snapshot: string;
};

const CreateItemIssueResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export async function createItemIssue(
  itemId: string,
  body: CreateItemIssueBody,
): Promise<{ client_id: string }> {
  const parsed = await apiClient.post(
    `/api/v1/items/${itemId}/issues`,
    CreateItemIssueResponseSchema,
    body,
  );
  return parsed.data;
}
```

**New file: `items/api/delete-item-issue.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

// NOTE: verify HTTP status with backend handoff doc — 204 means use z.object({}).passthrough() instead.
const DeleteItemIssueResponseSchema = ApiEnvelopeSchema(z.object({})).extend({ ok: z.literal(true) });

export async function deleteItemIssue(
  itemId: string,
  issueId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/items/${itemId}/issues/${issueId}`,
    DeleteItemIssueResponseSchema,
  );
}
```

**New file: `items/api/set-upholstery-quantity.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

const SetQuantityResponseSchema = ApiEnvelopeSchema(z.object({})).extend({ ok: z.literal(true) });

export async function setUpholsteryQuantity(
  itemUpholsteryId: string,
  amountMeters: number,
): Promise<void> {
  await apiClient.post(
    `/api/v1/item-upholsteries/${itemUpholsteryId}/set-quantity`,
    SetQuantityResponseSchema,
    { amount_meters: amountMeters },
  );
}
```

---

### Phase D — Action hooks

---

#### Step 12 — Task action hooks

Each hook follows the `08_hooks.md` pattern: `useMutation`, cache snapshot before mutation, rollback on error, invalidate on settle.

**New file: `tasks/actions/use-update-task.ts`**

- Calls `updateTask(input)`.
- On settle: `queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.id) })`.
- No optimistic update needed for the detail page (data is refetched immediately).

**New file: `tasks/actions/use-delete-task.ts`**

- Calls `deleteTask(taskId)`.
- On settle: `queryClient.invalidateQueries({ queryKey: taskKeys.lists() })`.
- Returns `{ mutate, isPending }`.

**New file: `tasks/actions/use-resolve-task.ts`**

- Calls `resolveTask(taskId)`.
- On settle: `queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })` and `taskKeys.lists()`.
- Returns `{ mutate, isPending }`.

---

#### Step 13 — Item action hooks

**New file: `items/actions/use-update-item.ts`**

- Calls `updateItem(input)`.
- On settle: `queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })` — the caller must pass `taskId` so the task detail cache is refreshed after an item update.
- Signature: `useUpdateItem(taskId: string)` → returns `{ mutate, isPending }`.

**New file: `items/actions/use-delete-item-issue.ts`**

- Calls `deleteItemIssue(itemId, issueId)`.
- On settle: invalidate `taskKeys.detail(taskId)`.
- Signature: `useDeleteItemIssue(taskId: string)`.

**New file: `items/actions/use-create-item-issue.ts`**

- Calls `createItemIssue(itemId, body)`.
- On settle: invalidate `taskKeys.detail(taskId)`.
- Signature: `useCreateItemIssue(taskId: string)`.

**New file: `items/actions/use-set-upholstery-quantity.ts`**

- Calls `setUpholsteryQuantity(itemUpholsteryId, amountMeters)`.
- On settle: invalidate `taskKeys.detail(taskId)`.
- Signature: `useSetUpholsteryQuantity(taskId: string)`.

---

### Phase E — Flow, controller, provider

---

#### Step 14 — Create `tasks/flows/use-task-detail.flow.ts`

Assembles the `TaskDetailViewModel` from `useGetTaskQuery` data. Pure computation — no side effects, no actions.

Key computed values:

```ts
// Article label
const articleLabel = item
  ? (item.article_number ?? item.sku ?? 'Article number missing')
  : 'No item linked';

// Days left (from today to ready_by_at using UTC dates)
function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00Z`);
  if (isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ISO week number from a date string
function isoWeek(dateString: string): number {
  const d = new Date(dateString);
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 3);
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const dayOfYear = (d.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayOfYear - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

// Schedule week label
// - same week → "# W{n}"
// - different weeks → "# W{n} – W{m}"
function scheduleWeekLabel(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const ws = isoWeek(start);
  if (!end) return `# W${ws}`;
  const we = isoWeek(end);
  return ws === we ? `# W${ws}` : `# W${ws} – W${we}`;
}
```

Returns:
```ts
export type TaskDetailFlow = {
  query: ReturnType<typeof useGetTaskQuery>;
  viewModel: TaskDetailViewModel | null;
  issues: ItemIssue[];
  upholstery: ItemUpholstery | null;
  activeRequirement: ItemUpholsteryRequirement | null;
  images: ImageViewModel[];
  flowRecordsQuery: ReturnType<typeof useGetTaskFlowRecordsQuery>;
  loadMoreRecords: () => void;
};
```

---

#### Step 15 — Create `tasks/controllers/use-task-detail.controller.ts`

Wires `useTaskDetailFlow` with all action hooks and navigation methods. SRP: no view model computation, no API calls — only aggregation, state, and action dispatch.

Local state owned by the controller:
- `issueDeleteMode: boolean` — whether issue pills show the shake/delete mode

Methods the controller exposes:
```ts
type TaskDetailController = TaskDetailFlow & {
  // Navigation
  openMenu: () => void;
  openScheduledDateSheet: () => void;
  openQuantitySheet: () => void;
  openUpholsteryAmountSheet: () => void;
  openFlowRecordDetail: (record: TaskFlowRecord) => void;
  openImageViewer: (initialImageClientId: string) => void;
  openEditPage: () => void;
  closeSurface: () => void;
  // Issues
  issueDeleteMode: boolean;
  enterIssueDeleteMode: () => void;
  exitIssueDeleteMode: () => void;
  deleteIssue: (issueId: string) => void;
  // Mutations (exposed for bottom sheet pages to call directly via surface props)
  updateTask: (input: UpdateTaskInput) => void;
  updateItem: (input: UpdateItemInput) => void;
  setUpholsteryQuantity: (itemUpholsteryId: string, amountMeters: number) => void;
  deleteTask: () => void;
  resolveTask: () => void;
  isDeleting: boolean;
  isResolving: boolean;
};
```

`openMenu` opens `TASK_DETAIL_MENU_SHEET_SURFACE_ID` with `{ taskId }`.
`openScheduledDateSheet` opens `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` with `{ taskId, scheduledStartAt, scheduledEndAt }`.
`openQuantitySheet` opens `ITEM_QUANTITY_SHEET_SURFACE_ID` with `{ taskId, itemId, quantity }`.
`openUpholsteryAmountSheet` opens `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID` with `{ taskId, itemUpholsteryId, amountMeters }`.
`openImageViewer(initialImageClientId)` opens `IMAGE_VIEWER_SURFACE_ID` with the full `ImageViewerSurfaceProps` shape (imported from `@/features/images`):
```ts
{
  images: flow.images,                  // ImageViewModel[] from the flow
  initialImageClientId,
  entityType: 'item' as const,
  entityClientId: flow.viewModel?.task.client_id ?? '',
  mode: 'view' as const,
}
```
`closeSurface` calls `useSurface().closeTop()` — closes the topmost surface (the task detail slide itself).

---

#### Step 16 — Create `tasks/providers/TaskDetailProvider.tsx`

Standard context provider shell (per `23_providers.md`):

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { useTaskDetailController, type TaskDetailController } from '../controllers/use-task-detail.controller';

const TaskDetailContext = createContext<TaskDetailController | null>(null);

export function useTaskDetailContext(): TaskDetailController {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) throw new Error('useTaskDetailContext must be used inside TaskDetailProvider');
  return ctx;
}

export function TaskDetailProvider({
  taskId,
  children,
}: {
  taskId: string;
  children: ReactNode;
}): React.JSX.Element {
  const controller = useTaskDetailController(taskId);
  return <TaskDetailContext.Provider value={controller}>{children}</TaskDetailContext.Provider>;
}
```

---

### Phase F — Feature components

All components live under `features/tasks/components/detail/`. Each reads from `useTaskDetailContext()` only — no direct logic imports.

---

#### Step 17 — `TaskDetailHeader.tsx`

Renders three rows:
1. **Identity row:** `[articleLabel]  [StatePill state]  [⋯ menu button]`
2. **Type subheader:** `[TypeIcon]  {task_type label}`
3. **Ready-by row:** `[Calendar icon]  {dd-mm-yy}  [DaysLeftPill]`

`DaysLeftPill` is an internal component in this file (not exported). Rules:
- Hidden if `daysLeft > 99` or `daysLeft === null`
- When `urgentDaysLeft` (daysLeft ≤ 3): use framer-motion `animate` to cycle through `{ backgroundColor: ['var(--color-destructive)', 'transparent'] }` with `repeat: Infinity, repeatType: 'reverse', duration: 1`
- Otherwise: static `bg-amber-500/15 text-amber-600`
- Label: `{daysLeft}d`

```tsx
// DaysLeftPill (internal)
function DaysLeftPill({ days, urgent }: { days: number; urgent: boolean }): React.JSX.Element {
  const baseClass = 'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium';
  if (urgent) {
    return (
      <m.span
        animate={{ backgroundColor: ['hsl(var(--destructive))', 'transparent'] }}
        className={cn(baseClass, 'text-destructive')}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
      >
        {days}d
      </m.span>
    );
  }
  return (
    <span className={cn(baseClass, 'bg-amber-500/15 text-amber-600')}>
      {days}d
    </span>
  );
}
```

---

#### Step 18 — `TaskCustomerSection.tsx`

Only rendered when `viewModel.showCustomerSection` is true (i.e. `task.task_type !== 'internal'`).

Wrapped in `DashedInfoSection`. Renders a vertical list of rows, each with:
- Left: icon (`User`, `Phone`, `Mail`, `Truck`) colored `text-[var(--color-border)]`
- Right: value colored `text-[var(--color-primary)]`

Fields rendered (omit row if value is null):
- Customer name → placeholder `"No customer"` if `customer_id` is null
- `primary_phone_number`
- `primary_email`
- `fulfillmentMethodLabel` (derived in flow from `fulfillment_method` enum)

Icons from lucide-react: `User`, `Phone`, `Mail`, `Truck`.

---

#### Step 19 — `TaskIssuesSection.tsx`

Wrapped in `DashedInfoSection`.

**Structure:**
- A row of pill chips, each `<button>` showing `{issue_name_snapshot} · {severity_name_snapshot}`.
- When `issueDeleteMode` is true: each pill gets `animate-image-edit-shake ring-2 ring-destructive/30` (same pattern as `ImagePreviewTile`) and shows an `X` button in the top-right corner.
- A `+` button at the end of the pill list (always visible) opens the existing `ItemFastIssueSheetPage` via `useSurface().open(ITEM_FAST_ISSUE_SHEET_SURFACE_ID, { itemId })`. Import `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` from `@/features/items` (added to `items/surfaces.ts` and re-exported in Step 35).
- `onPointerDown` on a pill triggers `enterIssueDeleteMode` after a 500 ms long-press timer (same pattern as `ImagePreviewTile`).
- Tapping anywhere in the page body outside the section exits delete mode — this is handled by the section itself via a global `pointerdown` listener that calls `exitIssueDeleteMode` when the event target is outside the section's ref.

---

#### Step 20 — `TaskScheduledDeliverySection.tsx`

Wrapped in `DashedInfoSection`.

**Row content (inline, flex-wrap):**
- **Week pill** (`button`): `{scheduleWeekLabel}` — same pill style as issue chips. Tap → `openScheduledDateSheet()`.
- **Quantity pill** (`button`): `#{item.quantity}` — same pill style. Tap → `openQuantitySheet()`.

Both pills are displayed only when their data exists. If `scheduleWeekLabel` is null (no scheduled dates), week pill is omitted.

---

#### Step 21 — `TaskImagesSection.tsx`

Wrapped in `FormFieldContainer` (same as creation form).

Renders `EntityImagesProvider` + `ImagePreviewGrid` for the item's images. Pass `entityType="item"` and `entityClientId` from `viewModel.task.client_id` (the task's client ID, which is the entity the images are linked to). `EntityImagesProvider` fetches images itself — no pre-seeding needed.

```tsx
<FormFieldContainer>
  <EntityImagesProvider entityType="item" entityClientId={vm.task.client_id}>
    <ImagePreviewGrid />
  </EntityImagesProvider>
</FormFieldContainer>
```

`EntityImagesProvider` and `ImagePreviewGrid` are imported from `@/features/images`.

**Image viewer:** Tap triggers `controller.openImageViewer(imageClientId)` which opens the existing `IMAGE_VIEWER_SURFACE_ID` with full `ImageViewerSurfaceProps` (see Step 15).

---

#### Step 22 — `TaskUpholsterySection.tsx`

Wrapped in `DashedInfoSection`.

**Row 1:** `ItemUpholsteryField` (existing component from `@/features/items`) rendered read-display-only but tappable to open the upholstery picker. Pass `requirementState={activeRequirement?.state ?? null}` to show the state pill.

**Row 2 (below field):** Amount pill button — `{amountMeters} m` — same pill style. Tap → `openUpholsteryAmountSheet()`. Only rendered when `upholstery?.amount_meters != null`.

---

#### Step 23 — `TaskFlowTimeline.tsx`

**Structure:**
- A `<div ref={stickyRef}>` wrapping the section header (`"Timeline"` label + optional load-more link). Add `sticky top-0 z-10 bg-background` to make the header stick when scrolled.
- Below the header, a vertical list of `FlowRecordItem` components (internal).
- Show last 3 records initially; a "Load more" button below loads the next 10.

**`FlowRecordItem` (internal component):**
```
[dot on left spine] [title] [time]
```
- Left: a `2px` wide vertical line (`bg-border`) as the spine, with a `10px` circle dot (`rounded-full border-2`) at the top of each record. Dot color: gray by default (color rules are deferred — the plan specifies gray; colors can be updated later when rules are defined by the user).
- Dot has a `8px` soft radial glow: `shadow-[0_0_0_4px_color-mix(in_srgb,currentColor_20%,transparent)]`
- Title: `record.description` — `text-sm font-medium`
- Time: if same UTC date as today → `HH:mm`; otherwise → short date + time using `Intl.DateTimeFormat` with `weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'`
- Tap: `openFlowRecordDetail(record)`

**Pagination:**
- Initial render: show first page (3 records from the initial query fetch, which fetches 10 by default — slice first 3 visually from query data, show "show all" or paginate with "load more" button)
- "Load more" button calls `controller.loadMoreRecords()` which calls `fetchNextPage()` on the infinite query

---

#### Step 24 — `TaskDetailBottomActions.tsx`

Fixed bottom bar (above safe area). Two buttons:
- **Edit** (`button`, `bg-primary text-white`): calls `controller.openEditPage()`
- **Close** (`button`, `bg-muted text-foreground`): calls `controller.closeSurface()`

```tsx
<div className="fixed bottom-0 left-0 right-0 z-20 flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
  <button ... className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white">Edit</button>
  <button ... className="flex-1 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground">Close</button>
</div>
```

---

### Phase G — Pages and surface registrations

---

#### Step 25 — Surface IDs and props — update `tasks/surfaces.ts` and `items/surfaces.ts`

**Edit `features/items/surfaces.ts`:** Add an exported constant for the fast issue sheet surface ID (the string key already exists but was not exported):

```ts
export const ITEM_FAST_ISSUE_SHEET_SURFACE_ID = 'item-fast-issue-page';
```

**Edit `features/tasks/surfaces.ts`:** Add:

```ts
export const TASK_DETAIL_MENU_SHEET_SURFACE_ID = 'task-detail-menu-sheet';
export const TASK_SCHEDULED_DATE_SHEET_SURFACE_ID = 'task-scheduled-date-sheet';
export const ITEM_QUANTITY_SHEET_SURFACE_ID = 'item-quantity-sheet';
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID = 'item-upholstery-amount-sheet';
export const TASK_FLOW_RECORD_DETAIL_SHEET_SURFACE_ID = 'task-flow-record-detail-sheet';
export const TASK_EDIT_SLIDE_SURFACE_ID = 'task-edit-slide';

export type TaskDetailMenuSurfaceProps = { taskId: string };
export type TaskScheduledDateSurfaceProps = {
  taskId: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
};
export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  quantity: number;
};
export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
  amountMeters: number | null;
};
export type TaskFlowRecordDetailSurfaceProps = {
  description: string;
  createdAt: string;
};
export type TaskEditSlideSurfaceProps = { taskId: string };
```

Add lazy surface registrations for all six new surfaces to the `taskSurfaces` object.

---

#### Step 26 — `pages/tasks/TaskDetailMenuSheetPage.tsx`

Reads `TaskDetailMenuSurfaceProps` from `useSurfaceProps`. Contains:
- **Resolve task row:** A tappable row with a `CheckCircle` icon and "Mark as resolved" label. Calls `useResolveTask` directly.
- **Delete task row:** A `ConfirmActionButton` with `label="Delete task"`, `confirmLabel="Tap to confirm delete"`, `fillColor="var(--color-destructive)"`. On `onConfirm`: calls `useDeleteTask` and closes the surface on success.

Both actions invalidate the task list and close the detail slide after success.

---

#### Step 27 — `pages/tasks/TaskScheduledDateSheetPage.tsx`

Reads `TaskScheduledDateSurfaceProps`. Renders a date-range picker with two `DateOnlyField` inputs (start / end). Footer: `Save` + `Cancel` buttons. `Save` calls `updateTask({ id: taskId, scheduled_start_at, scheduled_end_at })` then closes. `Cancel` closes without saving.

---

#### Step 28 — `pages/tasks/ItemQuantitySheetPage.tsx`

Reads `ItemQuantitySurfaceProps`. Renders `ItemQuantityField` (existing from `features/items`). Footer: `Save` + `Cancel`. `Save` calls `updateItem({ id: itemId, quantity })` then closes. `Cancel` closes.

---

#### Step 29 — `pages/tasks/ItemUpholsteryAmountSheetPage.tsx`

Reads `ItemUpholsteryAmountSurfaceProps`. Renders a numeric input for meters. Footer: `Save` + `Cancel`. `Save` calls `setUpholsteryQuantity(itemUpholsteryId, amountMeters)` then closes. `Cancel` closes.

---

#### Step 30 — `pages/tasks/TaskFlowRecordDetailSheetPage.tsx` (stub)

Renders `record.description` and formatted `createdAt`. Body shows "Details coming soon." Registered for when tap-on-record is fully implemented.

---

#### Step 31 — `pages/tasks/TaskEditSlidePage.tsx` (stub)

Renders a "Edit mode — coming soon" placeholder. Registered as `task-edit-slide`. Implementation deferred to a separate plan.

---

#### Step 32 — Replace `pages/tasks/TaskDetailSlidePage.tsx`

Full replacement:

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { TaskDetailSurfaceProps } from '@/features/tasks/surfaces';
import { TaskDetailProvider, TaskDetailView } from '@/features/tasks';

export function TaskDetailSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  return (
    <TaskDetailProvider taskId={taskId ?? ''}>
      <TaskDetailView />
    </TaskDetailProvider>
  );
}
```

`TaskDetailView` is a new component in `features/tasks/components/detail/TaskDetailView.tsx` that assembles all sections:

```tsx
// Scrollable body + fixed bottom bar
function TaskDetailView(): React.JSX.Element {
  const controller = useTaskDetailContext();
  const vm = controller.viewModel;

  if (controller.query.isLoading || !vm) {
    return <TaskDetailSkeleton />;
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrollable body — pb accounts for fixed bottom bar */}
      <div className="flex-1 overflow-y-auto pb-[calc(var(--safe-bottom,0)+5rem)]">
        <TaskDetailHeader />

        <div className="flex flex-col gap-0 px-4 py-3">
          {/* Category + position row */}
          <div className="flex items-center justify-between px-1 py-2 text-sm text-muted-foreground">
            <span>{vm.categoryLabel ?? '—'}</span>
            {vm.item?.item_position ? <span>{vm.item.item_position}</span> : null}
          </div>

          {/* Grouped dashed containers */}
          <div className="flex flex-col">
            {vm.showCustomerSection ? <TaskCustomerSection /> : null}
            <TaskIssuesSection />
            <TaskScheduledDeliverySection />
            <TaskImagesSection />
            <TaskUpholsterySection />
          </div>

          {/* Timeline */}
          <div className="mt-3">
            <TaskFlowTimeline />
          </div>
        </div>
      </div>

      <TaskDetailBottomActions />
    </div>
  );
}
```

A `TaskDetailSkeleton` renders 3–4 `animate-pulse` placeholder blocks.

---

### Phase H — Public API and index updates

---

#### Step 33 — Update `app/surface-registry.ts`

Add all six new task surface registrations from `taskSurfaces` (they will be included automatically when `taskSurfaces` object in `tasks/surfaces.ts` is updated with the new lazy-loaded pages).

---

#### Step 34 — Update `tasks/index.ts`

Add exports for:
```ts
export { TaskDetailProvider, useTaskDetailContext } from './providers/TaskDetailProvider';
export { TaskDetailView } from './components/detail/TaskDetailView';
export type {
  TaskDetailViewModel,
  TaskDetailTaskRaw,
  TaskDetailItemRaw,
  TaskNote,
  TaskFlowRecord,
} from './types';
// Surface ID constants (values, not types — must use `export {}` not `export type {}`)
export {
  TASK_DETAIL_MENU_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DATE_SHEET_SURFACE_ID,
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_FLOW_RECORD_DETAIL_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
} from './surfaces';
export type {
  TaskDetailMenuSurfaceProps,
  TaskScheduledDateSurfaceProps,
  ItemQuantitySurfaceProps,
  ItemUpholsteryAmountSurfaceProps,
  TaskFlowRecordDetailSurfaceProps,
  TaskEditSlideSurfaceProps,
} from './surfaces';
```

---

#### Step 35 — Update `items/index.ts`

Add exports for:
```ts
export { useUpdateItem } from './actions/use-update-item';
export { useCreateItemIssue } from './actions/use-create-item-issue';
export { useDeleteItemIssue } from './actions/use-delete-item-issue';
export { useSetUpholsteryQuantity } from './actions/use-set-upholstery-quantity';
// ITEM_FAST_ISSUE_SHEET_SURFACE_ID is a value — export {}, not export type {}
export { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from './surfaces';
// ITEM_UPHOLSTERY_REQUIREMENT_STATE is a const array — export {}, not export type {}
export { ITEM_UPHOLSTERY_REQUIREMENT_STATE } from './types';
export type {
  ItemUpholsteryRequirement,
  ItemUpholsteryRequirementState,
} from './types';
```

---

## File manifest

### New files

| Path (relative to `src/`) | Purpose |
|---|---|
| `components/primitives/form-field-container/FormFieldContainer.tsx` | Moved from task-creation |
| `components/primitives/form-field-container/index.ts` | Barrel |
| `components/primitives/dashed-info-section/DashedInfoSection.tsx` | New primitive |
| `components/primitives/dashed-info-section/index.ts` | Barrel |
| `components/primitives/confirm-action-button/ConfirmActionButton.tsx` | New primitive |
| `components/primitives/confirm-action-button/index.ts` | Barrel |
| `features/tasks/api/get-task-flow-records.ts` | Flow records API fn |
| `features/tasks/api/use-get-task-query.ts` | Task detail query hook |
| `features/tasks/api/use-get-task-flow-records-query.ts` | Flow records infinite query |
| `features/tasks/api/update-task.ts` | Update task API fn |
| `features/tasks/api/delete-task.ts` | Delete task API fn |
| `features/tasks/api/resolve-task.ts` | Resolve task API fn |
| `features/tasks/actions/use-update-task.ts` | Update task action |
| `features/tasks/actions/use-delete-task.ts` | Delete task action |
| `features/tasks/actions/use-resolve-task.ts` | Resolve task action |
| `features/items/api/update-item.ts` | Update item API fn |
| `features/items/api/create-item-issue.ts` | Create issue API fn |
| `features/items/api/delete-item-issue.ts` | Delete issue API fn |
| `features/items/api/set-upholstery-quantity.ts` | Set quantity API fn |
| `features/items/actions/use-update-item.ts` | Update item action |
| `features/items/actions/use-create-item-issue.ts` | Create issue action |
| `features/items/actions/use-delete-item-issue.ts` | Delete issue action |
| `features/items/actions/use-set-upholstery-quantity.ts` | Set quantity action |
| `features/tasks/flows/use-task-detail.flow.ts` | Detail view model assembly |
| `features/tasks/controllers/use-task-detail.controller.ts` | Action wiring + navigation |
| `features/tasks/providers/TaskDetailProvider.tsx` | Context provider |
| `features/tasks/components/detail/TaskDetailView.tsx` | Page assembly component |
| `features/tasks/components/detail/TaskDetailHeader.tsx` | Header with days-left pill |
| `features/tasks/components/detail/TaskCustomerSection.tsx` | Customer info section |
| `features/tasks/components/detail/TaskIssuesSection.tsx` | Issues chips + shake mode |
| `features/tasks/components/detail/TaskScheduledDeliverySection.tsx` | Week + quantity pills |
| `features/tasks/components/detail/TaskImagesSection.tsx` | Image preview section |
| `features/tasks/components/detail/TaskUpholsterySection.tsx` | Upholstery + amount pill |
| `features/tasks/components/detail/TaskFlowTimeline.tsx` | Sticky paginated timeline |
| `features/tasks/components/detail/TaskDetailBottomActions.tsx` | Fixed Edit + Close bar |
| `pages/tasks/TaskDetailMenuSheetPage.tsx` | Resolve + delete menu |
| `pages/tasks/TaskScheduledDateSheetPage.tsx` | Inline schedule edit |
| `pages/tasks/ItemQuantitySheetPage.tsx` | Inline quantity edit |
| `pages/tasks/ItemUpholsteryAmountSheetPage.tsx` | Inline upholstery amount edit |
| `pages/tasks/TaskFlowRecordDetailSheetPage.tsx` | Flow record tap stub |
| `pages/tasks/TaskEditSlidePage.tsx` | Edit mode stub |

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/task-creation/components/ReturnFormContent.tsx` | Import `FormFieldContainer` from `@/components/primitives` |
| `features/task-creation/components/PreOrderFormContent.tsx` | Import `FormFieldContainer` from `@/components/primitives` |
| `features/task-creation/components/InternalFormContent.tsx` | Import `FormFieldContainer` from `@/components/primitives` |
| `features/items/components/fields/ItemUpholsteryField.tsx` | Add `requirementState` prop + requirement state pill |
| `features/items/types.ts` | Add `ItemUpholsteryRequirement` schema and types |
| `features/items/surfaces.ts` | Export `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` constant |
| `features/tasks/types.ts` | Add `TaskNote`, `TaskFlowRecord`, `TaskDetailTaskRaw`, `TaskDetailItemRaw`, `TaskDetailViewModel` |
| `features/tasks/api/get-task.ts` | Replace opaque schemas with typed ones; keep `task_steps` opaque |
| `features/tasks/api/task-keys.ts` | Add `flowRecords` key factory |
| `features/tasks/surfaces.ts` | Add 6 new surface IDs, props, lazy registrations |
| `features/tasks/index.ts` | Export new provider, view, types, surface IDs (values via `export {}`) |
| `features/items/index.ts` | Export new actions, types, and `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` |
| `components/primitives/index.ts` | Export `FormFieldContainer`, `DashedInfoSection`, `ConfirmActionButton` |
| `src/index.css` | Add `@keyframes confirm-fill` |

### Files to delete

| Path (relative to `src/`) |
|---|
| `features/task-creation/components/FormFieldContainer.tsx` |

---

## Risks and mitigations

- **Risk:** `TaskDetailTaskRaw` and `TaskDetailItemRaw` schemas differ from the existing `TaskSchema`/`ItemSchema` (use `client_id` not `id` as the primary key field). The controller and flow must consistently use `client_id` for lookups and never mix the two shapes.
  **Mitigation:** Naming is explicit — `Raw` suffix signals the un-normalized shape. The flow uses `task.client_id` everywhere; no casting to `TaskId` needed at the detail layer.

- **Risk:** `task_steps` in the detail response sends `client_id` but `TaskStepSchema` expects `id` (with transform). Using `z.record(z.string(), z.unknown())` keeps the field parseable but untyped.
  **Mitigation:** Task step data is display-only in the flow timeline; the timeline uses `task_flow_records` not `task_steps`. If typed step access is needed later, add a `TaskStepDetailSchema` with `client_id` in a follow-up plan.

- **Risk:** The `confirm-fill` CSS keyframe animation conflicts with Tailwind's purge if not referenced via a class name.
  **Mitigation:** The animation is applied via inline `style={{ animation: ... }}`, not a Tailwind class, so purge does not apply.

- **Risk:** Issue delete mode long-press and the global `pointerdown` exit listener may conflict on mobile if the user lifts their finger and re-taps quickly.
  **Mitigation:** Use a `didTriggerLongPress` ref (same pattern as `ImagePreviewTile`) to distinguish taps from long-presses. The global listener only fires on `pointerdown` outside the section container — this is already the correct deactivation pattern.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual (task detail load): navigate to any task → detail slide opens → title + state visible → body sections render
- Manual (null item): tap a task with no `primary_item` → "No item linked" shown, customer/issues/schedule/upholstery sections render gracefully
- Manual (days-left pill): set `ready_by_at` to tomorrow → `1d` pill appears; set to today → `0d` with pulsating animation
- Manual (issues shake): long-press an issue chip → shake + X appears → tap X → issue removed → tap outside → delete mode exits
- Manual (schedule edit): tap week pill → sheet opens with date pickers → save → week label updates
- Manual (quantity edit): tap quantity pill → sheet opens → change → save → quantity updates
- Manual (timeline): loads 3 records initially; tap "Load more" → next 10 append; timeline header sticks on scroll
- Manual (delete task): tap ⋯ → menu sheet → tap "Delete task" → fill animation starts → confirm → task deleted → detail slide closes
- Manual (resolve task): tap ⋯ → menu sheet → "Mark as resolved" → state pill changes to "Resolved"

---

## Review log

_(empty — awaiting implementation)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `davidloorenz`
