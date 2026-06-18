# PLAN_pending_upholstery_query_invalidation_20260618

## Metadata

- Plan ID: `PLAN_pending_upholstery_query_invalidation_20260618`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-18T00:00:00Z`
- Last updated at (UTC): `2026-06-18T10:41:55Z`
- Related issue/ticket: —
- Intention plan: n/a (targeted bug fix, no separate intention document)

## Goal and intent

- Goal: When the user changes an upholstery selection or sets a quantity from `TaskUpholsterySection` (inside `TaskDetailSlidePage`), the `PendingUpholsterySlidePage` list and counts must refresh so the resolved task disappears from the list.
- Business/user intent: The manager navigates from the pending-upholstery list into a task's detail, resolves the upholstery selection or quantity, presses back, and expects the list to have removed that task automatically.
- Non-goals: Changes to optimistic-update logic for the pending list; changes to the `PendingUpholsteryCard` direct-action paths (they already own their own `usePendingUpholsteryCreate`/`usePendingUpholsteryUpdate` hooks with full invalidation); any UI layout work.

## Scope

- In scope: `features/items/actions/use-update-item-upholstery.ts` — add `pendingSeatUpholsteryKeys.all` invalidation in `onSettled`.
- Out of scope: `use-create-item-upholstery.ts` (already invalidates), `use-set-upholstery-quantity.ts` (already invalidates), any controller or component files.
- Assumptions:
  - The pending-upholstery queries (`listQuery`, `countsQuery`) in `usePendingUpholsteryController` remain mounted while a child surface (`TaskDetailSlidePage`) is open on top. TanStack Query will automatically refetch them when they are marked stale via `invalidateQueries`.
  - The `accumulatedItems` reset logic in the controller (`offset === 0 ? data.items : appendDeduped(...)`) will correctly drop the resolved task once the query refetches fresh data from the server.

## Clarifications required

_(none — root cause is unambiguous)_

## Acceptance criteria

1. After selecting an upholstery for the first time on a task via `TaskUpholsterySection` (calls `createItemUpholstery.mutate`) and navigating back, the task no longer appears in the `missing_selection` pending list. *(already satisfied — no change needed)*
2. After **changing** an existing upholstery selection on a task via `TaskUpholsterySection` (calls `updateItemUpholstery.mutate`) and navigating back, the pending list and counts refetch — the task disappears or its counts update correctly.
3. After setting the upholstery amount via the `ItemUpholsteryAmountSheetPage` and closing the sheet, the pending list and counts refetch. *(already satisfied — no change needed)*
4. `npm run typecheck` reports zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- n/a — change is a one-line `invalidateQueries` call following the identical pattern already used in `use-create-item-upholstery.ts` and `use-set-upholstery-quantity.ts`.

### Local extensions loaded

- n/a

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Permitted reads for this plan:
- `features/items/actions/use-update-item-upholstery.ts` — to make the targeted edit
- `features/pending-upholstery/api/pending-seat-keys.ts` — to verify import path for `pendingSeatUpholsteryKeys`

### Skill selection

- Primary skill: n/a (targeted single-file edit, no skill required)

## Implementation plan

### Step 1 — Add `pendingSeatUpholsteryKeys.all` invalidation to `useUpdateItemUpholstery`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`

**Current `onSettled`:**
```ts
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
  void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
  if (itemId) {
    void queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.byItem(itemId),
    });
  }
},
```

**Change — add import and one invalidation call:**

Add to imports (mirrors the existing pattern in `use-create-item-upholstery.ts`):
```ts
import { pendingSeatUpholsteryKeys } from '@/features/pending-upholstery/api/pending-seat-keys';
```

Add inside `onSettled` (after the existing `upholsteryKeys.pickerLists()` call):
```ts
void queryClient.invalidateQueries({ queryKey: pendingSeatUpholsteryKeys.all });
```

**Final `onSettled`:**
```ts
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
  void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
  void queryClient.invalidateQueries({ queryKey: pendingSeatUpholsteryKeys.all });
  if (itemId) {
    void queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.byItem(itemId),
    });
  }
},
```

## Risks and mitigations

- Risk: Invalidating `pendingSeatUpholsteryKeys.all` on every upholstery update adds a small extra network request even when the pending-upholstery surface is not open.
  Mitigation: TanStack Query only triggers a network request when the query has active observers. If `PendingUpholsterySlidePage` is not mounted, the invalidation simply marks the query stale so it refetches when next opened — no extra request is made.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open `PendingUpholsterySlidePage` → tap a card → open `TaskDetailSlidePage` → change the upholstery via `TaskUpholsterySection` → navigate back → confirm the task is removed from the list (or counts update).

## Review log

- `2026-06-18`: Implemented the planned invalidation in `use-update-item-upholstery.ts` and verified `npm run typecheck` passes.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
