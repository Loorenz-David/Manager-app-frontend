# PLAN_item_upholstery_swap_20260524

## Metadata

- Plan ID: `PLAN_item_upholstery_swap_20260524`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-24T00:00:00Z`
- Last updated at (UTC): `2026-05-24T20:30:30Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Allow a manager to tap the upholstery field in the task detail and swap the linked upholstery via `PATCH /api/v1/item-upholsteries/{client_id}`.
- Business/user intent: When restoring a piece of furniture, the assigned upholstery may need to change. The field was built but intentionally disabled because the backend PATCH endpoint did not yet accept `upholstery_id`. The backend now supports it, so the field must be wired up.
- Non-goals: Changing `source` from the task detail UI. Editing `amount_meters` (already handled by "Edit amount" button). Creating new item upholstery records.

## Scope

- In scope:
  - New API function `update-item-upholstery.ts` calling `PATCH /api/v1/item-upholsteries/{client_id}`
  - New action hook `use-update-item-upholstery.ts` wrapping the mutation with task query invalidation
  - Export from `src/features/items/index.ts`
  - Add `updateItemUpholstery` action to `use-task-detail.controller.ts`
  - Remove `disabled` prop from `TaskUpholsterySection` and wire `onChange` to the mutation
  - Disable field while mutation is pending or when `activeRequirement.state === 'completed'`
  - Add `data-testid` to `ItemUpholsteryField` in `TaskUpholsterySection`
  - Vitest unit test for the action hook
  - Playwright test verifying swap end-to-end
- Out of scope:
  - Changing `source` field via UI
  - Optimistic updates (backend may block swap when requirement is `completed` — server is authoritative)
  - Adding `lazyWithPreload` to `upholstery-picker` surface (separate concern)
- Assumptions:
  - `UpholsteryPickerSlidePage.onSelect` callback receives the `upholstery_id` (the `client_id` field from `UpholsteryPickerOptionSchema`) — confirmed by reading both files
  - `PATCH /api/v1/item-upholsteries/{client_id}` response shape is `{ ok: true, warnings: [], data: {} }` — confirmed by user
  - No new surface is required; `upholstery-picker` slide surface already exists in `upholsterySurfaces`
  - `ItemUpholsteryField` internally opens `upholstery-picker` and calls `onChange` with the selected `client_id` — no flow-level opener needed

## Clarifications required

_(none — all ambiguities resolved above)_

## Acceptance criteria

1. Tapping the upholstery field in the task detail opens `UpholsteryPickerSlidePage`.
2. Selecting a different upholstery calls `PATCH /api/v1/item-upholsteries/{client_id}` with the correct `upholstery_id` in the body.
3. After the mutation settles, the task detail query is invalidated and the field reflects the new upholstery.
4. The field is disabled while the mutation is in-flight (`updateItemUpholstery.isPending === true`).
5. The field is disabled when `entry.activeRequirement?.state === 'completed'` (swap blocked by backend rule).
6. `npm run typecheck` reports zero errors.
7. Vitest unit test for `useUpdateItemUpholstery` passes.
8. Playwright mobile and desktop tests for the swap flow pass.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer dependency rules — API → action → controller → component
- `architecture/02_types.md`: Zod schema and type conventions
- `architecture/04_api_client.md`: `apiClient.patch` usage, response envelope shape
- `architecture/05_server_state.md`: query invalidation on mutation settled
- `architecture/08_hooks.md`: action hook pattern — `useMutation`, `onSettled` invalidation, no optimistic update needed here
- `architecture/13_errors.md`: error handling conventions
- `architecture/15_feature_structure.md`: file placement rules
- `architecture/17_testing.md`: Vitest action hook test shape

### Local extensions loaded

- `architecture/04_api_client_local.md`: backend error shape (flat string), empty `data: {}` envelope pattern — applies to response schema here
- `architecture/34_runtime_validation_local.md`: fixture paths, auth, `data-testid` naming convention, Playwright spec location

### File read intent — pattern vs. relational

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand mutation/invalidation shape → `08_hooks.md`
- Reading another API function to understand `apiClient` usage → `04_api_client.md`

Permitted (relational reads — understanding what exists):
- `src/features/items/api/set-item-upholstery-quantity.ts` — to confirm existing empty-envelope response pattern for item-upholstery mutations ✓ (already read)
- `src/features/items/actions/use-set-upholstery-quantity.ts` — to confirm invalidation pattern used for this feature ✓ (already read)
- `src/features/tasks/flows/use-task-detail.flow.ts` — to confirm no new opener is needed ✓ (already read)
- `src/features/tasks/surfaces.ts` — to confirm `upholstery-picker` is already registered ✓ (already read)
- `src/features/items/components/fields/ItemUpholsteryField.tsx` — to confirm `onChange` receives the selected `upholstery_id` (picker's `client_id`) ✓ (already read)
- `src/features/tasks/components/detail/TaskUpholsterySection.tsx` — to understand current `disabled`/`onChange` wiring ✓ (already read)
- `src/features/items/index.ts` — to confirm current public API exports ✓ (already read)

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: `action hook`, `mutation`, `PATCH`, `invalidate`
- Excluded alternatives: none

## Implementation plan

### Step 1 — API function

**File**: `src/features/items/api/update-item-upholstery.ts` _(new file)_

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const UpdateItemUpholsteryInputSchema = z.object({
  itemUpholsteryId: z.string(),
  upholstery_id: z.string(),
});
export type UpdateItemUpholsteryInput = z.infer<typeof UpdateItemUpholsteryInputSchema>;

const UpdateItemUpholsteryResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function updateItemUpholstery(input: UpdateItemUpholsteryInput) {
  const { itemUpholsteryId, ...body } = UpdateItemUpholsteryInputSchema.parse(input);
  return apiClient.patch(
    `/api/v1/item-upholsteries/${itemUpholsteryId}`,
    UpdateItemUpholsteryResponseSchema,
    body,
  );
}
```

- Pattern mirrors `set-item-upholstery-quantity.ts`: define schema inline, destructure path param, pass rest as body.
- `ApiEnvelopeSchema(z.object({}))` matches the confirmed empty-data envelope.

---

### Step 2 — Action hook

**File**: `src/features/items/actions/use-update-item-upholstery.ts` _(new file)_

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/features/tasks/api/task-keys';
import { updateItemUpholstery } from '../api/update-item-upholstery';

export function useUpdateItemUpholstery(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
```

- No optimistic update. Backend may reject the swap (`COMPLETED` requirement) — server is authoritative.
- `taskId as never` cast mirrors the existing pattern in `use-set-upholstery-quantity.ts`.

---

### Step 3 — Public API export

**File**: `src/features/items/index.ts` _(modify)_

Add to the action exports block:

```ts
export { useUpdateItemUpholstery } from './actions/use-update-item-upholstery';
```

---

### Step 4 — Controller

**File**: `src/features/tasks/controllers/use-task-detail.controller.ts` _(modify)_

Add import:
```ts
import { useUpdateItemUpholstery } from '@/features/items/actions/use-update-item-upholstery';
```

Add inside `useTaskDetailController`:
```ts
const updateItemUpholstery = useUpdateItemUpholstery(taskId);
```

Add to return object:
```ts
updateItemUpholstery,
```

---

### Step 5 — Component wiring

**File**: `src/features/tasks/components/detail/TaskUpholsterySection.tsx` _(modify)_

Destructure `updateItemUpholstery` from context:
```ts
const { activeUpholstery, openUpholsteryAmountSheet, taskDetail, updateItemUpholstery } =
  useTaskDetailContext();
```

Replace the `ItemUpholsteryField` call to:
```tsx
<ItemUpholsteryField
  data-testid={`upholstery-field-${entry.client_id}`}
  description="Linked upholstery"
  disabled={
    entry.activeRequirement?.state === 'completed' ||
    updateItemUpholstery.isPending
  }
  onChange={(newUpholsteryId) => {
    updateItemUpholstery.mutate({
      itemUpholsteryId: entry.client_id,
      upholstery_id: newUpholsteryId,
    });
  }}
  requirementState={entry.activeRequirement?.state ?? null}
  testId={`upholstery-field-${entry.client_id}`}
  title="Upholstery"
  value={entry.upholstery_id}
/>
```

Note: `ItemUpholsteryField` does not spread arbitrary props, so the `data-testid` must be passed via the `testId` prop (which the component forwards to the `<button>` element).

---

### Step 6 — Vitest unit test

**File**: `src/features/items/actions/use-update-item-upholstery.test.ts` _(new file)_

Test shape follows `08_hooks.md` action hook test pattern:
- Render `useUpdateItemUpholstery('task-123')` inside a query-client wrapper.
- Mock `updateItemUpholstery` API function to resolve successfully.
- Call `result.current.mutate({ itemUpholsteryId: 'iu-abc', upholstery_id: 'u-xyz' })`.
- Assert `invalidateQueries` was called with `taskKeys.detail('task-123' as never)`.

---

### Step 7 — Playwright test

**File**: `tests/playwright/features/tasks/upholstery-swap.spec.ts` _(new file)_

```ts
import { test, expect } from '../../fixtures/app-fixture';

test.describe('task detail — upholstery swap', () => {
  test('user can swap the linked upholstery', async ({ page, auth }) => {
    await auth.signIn();
    // Navigate to a task with an active upholstery
    // (use a seeded/known task from the test environment)
    await page.goto('/tasks');
    // Open first task that has upholstery linked
    await page.getByTestId('task-card').first().click();
    // Tap the upholstery field
    await page.getByTestId(/upholstery-field-/).first().click();
    // Picker slide opens
    await expect(page.getByTestId('upholstery-picker-slide-page')).toBeVisible();
    // Select the first available upholstery card
    await page.getByTestId(/upholstery-card-/).first().click();
    // Picker closes
    await expect(page.getByTestId('upholstery-picker-slide-page')).not.toBeVisible();
    // Task detail re-fetches and field is still visible (not in error state)
    await expect(page.getByTestId(/upholstery-field-/).first()).toBeVisible();
  });
});
```

Run:
- `npx playwright test --grep "upholstery swap" --project=mobile`
- `npx playwright test --grep "upholstery swap" --project=desktop`

## Risks and mitigations

- Risk: `taskId as never` cast in the action hook may hide a type mismatch if `taskKeys.detail` signature changes.
  Mitigation: Pattern is already established in `use-set-upholstery-quantity.ts` — keep consistent; address if `taskKeys` is properly typed later.

- Risk: Swap silently fails when `activeRequirement.state === 'completed'` without user feedback.
  Mitigation: Field is visually disabled when state is `completed` — user cannot trigger the mutation. No toast needed for this plan; error surfacing is out of scope.

- Risk: Mutation error (e.g. network failure) leaves no visible feedback.
  Mitigation: Out of scope for this plan. Error UI conventions are addressed by `13_errors.md` globally; task query will remain stale rather than corrupt.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep use-update-item-upholstery`: Vitest unit test passes
- `npx playwright test --grep "upholstery swap" --project=mobile`: swap flow passes
- `npx playwright test --grep "upholstery swap" --project=desktop`: swap flow passes

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
