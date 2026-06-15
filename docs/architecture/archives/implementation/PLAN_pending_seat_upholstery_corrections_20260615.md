# PLAN_pending_seat_upholstery_corrections_20260615

## Metadata

- Plan ID: `PLAN_pending_seat_upholstery_corrections_20260615`
- Status: `archived`
- Owner agent: `planner-architect`
- Created at (UTC): `2026-06-15T16:30:00Z`
- Last updated at (UTC): `2026-06-15T16:31:00Z`
- Related issue/ticket: `N/A`
- Source plan: `docs/architecture/archives/implementation/PLAN_pending_seat_upholstery_management_20260615.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_pending_seat_upholstery_management_20260615.md`

---

## Goal and intent

- **Goal:** Apply five targeted corrections to the pending seat upholstery implementation identified during post-implementation review. No new features. No refactors beyond the minimum required to fix each issue.
- **Business/user intent:** Ensure the feature behaves as specified: the home button is always usable, the filter pill labels match the spec, the search bar has no orphaned buttons, the missing-quantity row disappears immediately after saving the amount, and dead code is removed.
- **Non-goals:** New tests beyond what is required to validate the corrections, architectural changes, moving files, or touching anything not listed in the steps below.

---

## Scope

- **In scope:**
  1. Remove `disabled={countsQuery.isError}` from `HomeView`
  2. Add optimistic removal to `useSetUpholsteryQuantity` for pending-seat list caches
  3. Rename filter pill label from "Missing amount" to "Missing quantity" in `PendingUpholsteryHeader`
  4. Add `showSortButton={false}` and `showFilterButton={false}` to `SearchBar` in `PendingUpholsteryHeader`
  5. Remove the dead `isMutationPending` field from `PendingSeatCardViewModel`, `toPendingSeatCardViewModel`, the controller, and `PendingUpholsteryCard`

- **Out of scope:** New test files, changes to the amount sheet surface, new surface registrations, changes to the original plan document, any features from the intention doc not already implemented.

---

## Clarifications required

_None. All five corrections are unambiguous from the reviewed code._

---

## Acceptance criteria

1. Tapping "Select upholstery" on the home screen works even when the counts endpoint has errored.
2. After saving a positive upholstery amount in the amount sheet, the originating card disappears from the list immediately (optimistic removal), not only after refetch.
3. The "Missing quantity" filter pill shows the correct label (not "Missing amount").
4. The pending page search bar shows no sort or filter button icons.
5. `PendingSeatCardViewModel` has no `isMutationPending` field; `toPendingSeatCardViewModel` takes two arguments (row, not a third boolean); `TypeScript typecheck passes`.

---

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: `onMutate`/`onError`/`onSettled` snapshot/restore pattern for optimistic mutations

### File read intent — pattern vs. relational

Permitted reads only:
- Reading `src/features/items/actions/use-set-upholstery-quantity.ts` to see the exact current `onSettled` before adding `onMutate`/`onError`
- Reading `src/features/pending-upholstery/actions/use-pending-upholstery-create.ts` to copy the exact snapshot/restore pattern (relational — understanding what exists, not a pattern read)
- Reading `src/features/pending-upholstery/types.ts` to see the exact field to remove
- Reading `src/features/pending-upholstery/lib/pending-seat-dto.ts` to see the function signature to simplify
- Reading `src/features/pending-upholstery/controllers/use-pending-upholstery.controller.ts` to see the `toPendingSeatCardViewModel(row, false)` call to fix
- Reading `src/features/pending-upholstery/components/PendingUpholsteryCard.tsx` to see the `isPending` expression to simplify

Prohibited: reading any other file not in the correction steps.

---

## Verified findings (from post-implementation review)

These are confirmed facts — Codex must not re-derive them by reading files again before acting.

```
HomeView.tsx:22          disabled={countsQuery.isError}          — remove this prop
PendingUpholsteryHeader.tsx:53-54  "Missing amount"              — rename to "Missing quantity"
PendingUpholsteryHeader.tsx:78-86  <SearchBar ...>               — missing showSortButton/showFilterButton
use-set-upholstery-quantity.ts     no onMutate/onError           — add optimistic pending-seat removal
PendingSeatCardViewModel           isMutationPending field        — dead, always false, remove
toPendingSeatCardViewModel         second param always false      — remove param
controller:85                      toPendingSeatCardViewModel(row, false) — remove second arg
PendingUpholsteryCard:32           card.isMutationPending         — remove from isPending expression
```

`SearchBar` defaults confirmed: `showSortButton = true`, `showFilterButton = true` — both buttons are currently rendered with no handlers.

---

## Implementation plan

---

### Correction 1 — HomeView: remove disabled on counts error

**File:** `src/features/home/components/HomeView.tsx`

Remove the `disabled` prop from the pending-upholstery button entirely. The button must remain tappable regardless of counts query state. The label already gracefully degrades to "Select upholstery" (no count) when `total` is `null`.

Before:
```tsx
<button
  className="..."
  disabled={countsQuery.isError}
  type="button"
  onClick={() => surface.open(PENDING_UPHOLSTERY_SLIDE_ID, {})}
>
```

After:
```tsx
<button
  className="..."
  type="button"
  onClick={() => surface.open(PENDING_UPHOLSTERY_SLIDE_ID, {})}
>
```

No other change to this file.

---

### Correction 2 — useSetUpholsteryQuantity: add optimistic pending-seat removal

**File:** `src/features/items/actions/use-set-upholstery-quantity.ts`

Add `onMutate` and `onError` callbacks alongside the existing `onSettled`. The mutation receives `{ itemUpholsteryId, amount_meters }` but the hook closes over `taskId`. Use `taskId` to remove the matching row from all pending-seat list caches.

**Rationale:** Saving a positive upholstery amount resolves the `missing_quantity` condition. Removing the row from all pending-seat lists on `onMutate` is safe: a task that had `missing_quantity` is no longer pending in any bucket after a successful amount save. The amount sheet opens with `taskId` as a prop, so `taskId` is always available in the hook closure.

**Pattern to follow:** Copy the exact snapshot/restore structure from `src/features/pending-upholstery/actions/use-pending-upholstery-create.ts`. The differences are:
- Remove from **all** pending-seat list caches (not only `missing_selection=true && missing_quantity=false` ones), because saving a quantity resolves `missing_quantity` which can appear in `missing_quantity`-only lists and combined lists.
- Decrement `missing_quantity_total` (not `missing_selection_total`).

```typescript
// Add these imports at the top of use-set-upholstery-quantity.ts:
import { pendingSeatUpholsteryKeys } from '@/features/pending-upholstery/api/pending-seat-keys';
import type { PendingSeatTasksPage } from '@/features/pending-upholstery/api/fetch-pending-seat-tasks';
import type { PendingSeatCounts } from '@/features/pending-upholstery/types';

// Inside useMutation, add onMutate and onError before the existing onSettled:

onMutate: async () => {
  await queryClient.cancelQueries({ queryKey: pendingSeatUpholsteryKeys.lists() });
  await queryClient.cancelQueries({ queryKey: pendingSeatUpholsteryKeys.counts() });

  const previousLists = queryClient.getQueriesData<PendingSeatTasksPage>({
    queryKey: pendingSeatUpholsteryKeys.lists(),
  });
  const previousCounts = queryClient.getQueryData<PendingSeatCounts>(
    pendingSeatUpholsteryKeys.counts(),
  );

  // Remove from every cached pending list — saving amount resolves missing_quantity
  // in any filter combination.
  previousLists.forEach(([queryKey]) => {
    queryClient.setQueryData<PendingSeatTasksPage>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.filter((row) => row.task.client_id !== taskId),
      };
    });
  });

  queryClient.setQueryData<PendingSeatCounts>(
    pendingSeatUpholsteryKeys.counts(),
    (old) =>
      old
        ? { ...old, missing_quantity_total: Math.max(old.missing_quantity_total - 1, 0) }
        : old,
  );

  return { previousLists, previousCounts };
},

onError: (_error, _input, context) => {
  context?.previousLists.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
  queryClient.setQueryData(pendingSeatUpholsteryKeys.counts(), context?.previousCounts);
},

// existing onSettled stays unchanged
```

**Verification:** After this change, when a user saves the upholstery amount from the amount sheet, the card disappears immediately from the pending list. If the save fails, the card reappears. The `onSettled` invalidation then reconciles with the server.

---

### Correction 3 — PendingUpholsteryHeader: rename filter pill label

**File:** `src/features/pending-upholstery/components/PendingUpholsteryHeader.tsx`

Change the `quantityLabel` variable (lines 53-54) from "Missing amount" to "Missing quantity".

Before:
```typescript
const quantityLabel =
  counts && !countsError
    ? `Missing amount (${formatCompactCount(counts.missing_quantity_total)})`
    : "Missing amount";
```

After:
```typescript
const quantityLabel =
  counts && !countsError
    ? `Missing quantity (${formatCompactCount(counts.missing_quantity_total)})`
    : "Missing quantity";
```

No other change to this file.

---

### Correction 4 — PendingUpholsteryHeader: suppress SearchBar buttons

**File:** `src/features/pending-upholstery/components/PendingUpholsteryHeader.tsx`

Add `showSortButton={false}` and `showFilterButton={false}` to the `SearchBar` render. Both props default to `true` in the `SearchBar` component, so without them sort and filter buttons are rendered with no handlers.

Before:
```tsx
<SearchBar
  data-testid="pending-upholstery-search"
  isLoading={isLoading}
  placeholder="Search pending tasks..."
  value={searchInput}
  wrapperClassName="bg-card"
  onChange={onSearchChange}
/>
```

After:
```tsx
<SearchBar
  data-testid="pending-upholstery-search"
  isLoading={isLoading}
  placeholder="Search pending tasks..."
  showFilterButton={false}
  showSortButton={false}
  value={searchInput}
  wrapperClassName="bg-card"
  onChange={onSearchChange}
/>
```

No other change to this file.

---

### Correction 5 — Remove dead `isMutationPending` field

This correction touches four files. Apply all four changes; they form a single atomic unit — TypeScript will error if any one is partial.

**5a. `src/features/pending-upholstery/types.ts`**

Remove `isMutationPending: boolean` from `PendingSeatCardViewModel`:

Before:
```typescript
export type PendingSeatCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  primaryItem: Item | null;
  firstImage: ImageViewModel | null;
  images: ImageViewModel[];
  pendingReason: PendingUpholsteryReason;
  itemUpholsteryId: string | null;
  isMutationPending: boolean;
};
```

After:
```typescript
export type PendingSeatCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  primaryItem: Item | null;
  firstImage: ImageViewModel | null;
  images: ImageViewModel[];
  pendingReason: PendingUpholsteryReason;
  itemUpholsteryId: string | null;
};
```

**5b. `src/features/pending-upholstery/lib/pending-seat-dto.ts`**

Remove `isMutationPending` parameter and the field from the returned object:

Before:
```typescript
export function toPendingSeatCardViewModel(
  row: PendingSeatTaskRow,
  isMutationPending: boolean,
): PendingSeatCardViewModel {
  ...
  return {
    ...
    isMutationPending,
  };
}
```

After:
```typescript
export function toPendingSeatCardViewModel(
  row: PendingSeatTaskRow,
): PendingSeatCardViewModel {
  ...
  return {
    taskId: row.task.client_id,
    task: toTaskViewModel(toTaskFromPendingRaw(row.task)),
    primaryItem,
    firstImage: images[0] ?? null,
    images,
    pendingReason: row.pending_upholstery_reason,
    itemUpholsteryId: row.item_upholstery_id,
  };
}
```

**5c. `src/features/pending-upholstery/controllers/use-pending-upholstery.controller.ts`**

Remove the second argument from the `toPendingSeatCardViewModel` call:

Before:
```typescript
const cards = useMemo<PendingSeatCardViewModel[]>(
  () => accumulatedItems.map((row) => toPendingSeatCardViewModel(row, false)),
  [accumulatedItems],
);
```

After:
```typescript
const cards = useMemo<PendingSeatCardViewModel[]>(
  () => accumulatedItems.map((row) => toPendingSeatCardViewModel(row)),
  [accumulatedItems],
);
```

**5d. `src/features/pending-upholstery/components/PendingUpholsteryCard.tsx`**

Remove `card.isMutationPending` from the `isPending` expression. The card's own `createUpholstery.isPending` already correctly tracks the `missing_selection` mutation state. For `missing_quantity`, the action opens the amount sheet (no local mutation state needed at the card level).

Before:
```typescript
const isPending = card.isMutationPending || createUpholstery.isPending;
```

After:
```typescript
const isPending = createUpholstery.isPending;
```

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors — the removed field must cause no remaining references
- `npm run test:unit -- src/features/pending-upholstery/`: existing formatter tests still pass
- Manual: home screen — tap "Select upholstery" while counts endpoint is down → page opens
- Manual: filter pills — both pills show "Missing selection" and "Missing quantity" labels
- Manual: search bar — no sort or filter button icons visible in the pending page header
- Manual: open a `missing_quantity` card, set an amount and save → card disappears from list immediately without waiting for refetch
- Manual: save amount → fail the request → card reappears (rollback)
- Manual: `missing_selection` card still shows "Saving..." and disables its button during the create mutation

---

## Review log

- `2026-06-15` planner-architect: correction plan written from post-implementation review findings
- `2026-06-15` Codex: implemented corrections, passed typecheck and pending-upholstery unit tests, wrote summary and archive record.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
