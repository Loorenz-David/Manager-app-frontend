# PLAN_task_list_card_to_package_20260627

## Metadata

- Plan ID: `PLAN_task_list_card_to_package_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T12:08:11Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Move `TaskListCard` from the managers app into `@beyo/tasks`, giving both the managers app and `@beyo/task-working-sections` a single shared card component.
- Business/user intent: The quick-assign slide (`QuickTaskAssignSlidePage`) needed a duplicate card (`QuickTaskListCard`) because packages cannot import from apps. Having two cards with diverging display logic is a maintenance burden. A shared, props-driven card in `@beyo/tasks` resolves the duplication at the right layer.
- Non-goals:
  - Moving `TaskCardViewModel`, `TaskViewModel`, or `Item` to packages — the app's view model layer stays in the app; only the visual component moves.
  - Workers app changes — workers app has its own task card (`TaskStepCard`) and is not affected.
  - Moving `PendingSeatCardViewModel` or any upholstery-related types to packages.

## Scope

- In scope:
  - Create `packages/tasks/src/components/TaskListCard.tsx` with a minimal, package-level props interface.
  - Export `TaskListCard` and `TaskListCardProps` from `packages/tasks/src/index.ts`.
  - Delete `apps/managers-app/.../features/tasks/components/TaskListCard.tsx`.
  - Update `TasksView.tsx` to import from `@beyo/tasks` and adapt props from `TaskCardViewModel` → new interface.
  - Update `PendingUpholsteryCard.tsx` to import from `@beyo/tasks` and adapt props.
  - Delete `packages/task-working-sections/src/components/QuickTaskListCard.tsx`.
  - Update `QuickTaskAssignSlidePage.tsx` to use `TaskListCard` from `@beyo/tasks` directly, passing the assign button via `bottomAction`.
  - Remove `QuickTaskListCard` export from `packages/task-working-sections/src/index.ts`.

- Out of scope:
  - Changing `TaskCardViewModel` or `TaskViewModel` in the app's `types.ts`.
  - Playwright test updates (testid prefix `tasks-card-*` is preserved on the new card).
  - Changing `PendingSeatCardViewModel` or `usePendingUpholsteryCreate` / `usePendingUpholsteryUpdate`.
  - `PLAN_quick_task_assign_slide_corrections_20260627` fixes §3d/§3e are now superseded by this plan (QuickTaskListCard is deleted); corrections §1, §2, §4 remain valid.

- Assumptions:
  - `StatePill`, `ImagePlaceholder` from `@/components/primitives` already exist in `@beyo/ui` (confirmed via grep).
  - `TaskType`, `TaskState`, `TaskReturnSource` are already exported from `@beyo/tasks` (confirmed via `index.ts`).
  - `formatLocalDateYYMMDD`, `TASK_TYPE_ICON`, `TASK_TYPE_LABEL`, `RETURN_SOURCE_LABEL`, `TASK_STATE_VARIANT` are already in `packages/tasks/src/lib/task-detail.ts` (confirmed via `index.ts` exports).
  - `item_images` on `TaskListItemRaw` is `z.array(z.record(z.string(), z.unknown()))` — image URL must be extracted with a type guard.
  - `PendingSeatCardViewModel` has fields that can be mapped to the new card props. Codex must read `PendingUpholsteryCard.tsx` fully and `PendingSeatCardViewModel` (likely in `apps/managers-app/.../features/pending-upholstery/types.ts`) to get the exact field names before writing the adapter.

## Clarifications required

_(none — all decisions resolved)_

## Acceptance criteria

1. `packages/tasks/src/components/TaskListCard.tsx` exists and imports only from `@beyo/ui`, `@beyo/lib`, `lucide-react`, and package-local paths.
2. `TaskListCard` and `TaskListCardProps` are exported from `packages/tasks/src/index.ts`.
3. `apps/managers-app/.../features/tasks/components/TaskListCard.tsx` is deleted.
4. `packages/task-working-sections/src/components/QuickTaskListCard.tsx` is deleted.
5. `TasksView` and `PendingUpholsteryCard` import `TaskListCard` from `@beyo/tasks`, not from a local path.
6. `QuickTaskAssignSlidePage` imports `TaskListCard` from `@beyo/tasks`; no import of `QuickTaskListCard`.
7. `npm run typecheck` passes with zero errors across all changed files.
8. The visual output of both `TasksView` and the quick-assign slide is unchanged (same icons, badges, testids, bottom action slot).

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component props conventions, `memo`, `data-testid` placement
- `architecture/14_styling.md`: Tailwind conventions, `@beyo/ui` primitives
- `architecture/03_monorepo.md`: package boundary rules — packages cannot import from apps

### File read intent

Permitted relational reads before implementation:
- `apps/managers-app/.../features/pending-upholstery/components/PendingUpholsteryCard.tsx` — full file, to understand how `card` fields map to `TaskListCard` props.
- `apps/managers-app/.../features/pending-upholstery/types.ts` — to see `PendingSeatCardViewModel` field names.
- `packages/tasks/src/lib/task-detail.ts` — to confirm `TASK_TYPE_ICON`, `TASK_TYPE_LABEL`, `RETURN_SOURCE_LABEL`, `TASK_STATE_VARIANT` are already exported.
- `packages/tasks/src/components/detail/index.ts` — to verify no naming conflict with a `TaskListCard` in the detail barrel.

Prohibited (pattern reads — contract already covers):
- Reading another card/list component to understand how to write the new one.
- Reading `StatePill` or `ImagePlaceholder` source — they are already used in the existing `TaskListCard`.

---

## Implementation plan

### Step 1 — Create `TaskListCard` in `@beyo/tasks`

**File to create:** `packages/tasks/src/components/TaskListCard.tsx`

This is a direct transplant of the existing app card with three changes:
- Imports repointed to package sources.
- Props redesigned to a flat, package-level interface (no `TaskCardViewModel`, no `Item`, no `ImageViewModel`).
- `is_overdue` is optional; if not provided, computed from `ready_by_at` inline.

**New props type (`TaskListCardProps`):**

```ts
export type TaskListCardProps = {
  taskId: string;
  task: {
    task_type: TaskType;
    state: TaskState;
    return_source: TaskReturnSource | null;
    ready_by_at: string | null;
    is_overdue?: boolean;
  };
  item: {
    itemId: string | null;
    article_number: string | null;
    sku: string | null;
    item_major_category_snapshot: string | null;
    quantity: number;
  } | null;
  imageUrl: string | null;
  onTapImage?: (taskId: string) => void;
  onTapActions?: (taskId: string, itemId: string | null) => void;
  onTapCard?: (taskId: string) => void;
  bottomAction?: React.ReactNode;
};
```

**Imports inside the new file:**

```ts
import { memo } from "react";
import { Calendar, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@beyo/ui";
import type { StatePillVariant } from "@beyo/ui";

import type { TaskReturnSource, TaskState, TaskType } from "../types";
import { formatLocalDateYYMMDD } from "../lib/task-detail";
```

> `TASK_TYPE_ICON`, `TASK_TYPE_LABEL`, `RETURN_SOURCE_LABEL`, and `TASK_STATE_VARIANT` already exist in `lib/task-detail.ts` and are exported from the package. If they are already exported there and already typed correctly, import them from `"../lib/task-detail"` instead of re-defining them locally.
>
> Codex: verify by reading `packages/tasks/src/lib/task-detail.ts` and `packages/tasks/src/index.ts` before deciding whether to import or re-declare. If already exported with the right types, import them. Do not duplicate.

**Component logic:**

```ts
const isOverdue = task.is_overdue ?? (
  task.ready_by_at ? new Date(task.ready_by_at) < new Date() : false
);

const articleLabel = item
  ? item.article_number
    ? `#${item.article_number}`
    : (item.sku ?? "Article number missing")
  : "No item linked";

const quantityPillLabel =
  item?.item_major_category_snapshot?.toLowerCase() === "seat"
    ? `#${item.quantity}`
    : null;

const TypeIcon: LucideIcon = TASK_TYPE_ICON[task.task_type] ?? ShoppingBag;
const typeLabel = TASK_TYPE_LABEL[task.task_type] ?? task.task_type;
const returnSourceLabel = task.return_source
  ? (RETURN_SOURCE_LABEL[task.return_source] ?? null)
  : null;
const stateVariant: StatePillVariant = TASK_STATE_VARIANT[task.state] ?? "neutral";
const readyByLabel = formatLocalDateYYMMDD(task.ready_by_at);
```

**JSX structure:** keep identical to the existing `apps/managers-app/.../TaskListCard.tsx` (same layout, same testids `tasks-card-${taskId}`, `tasks-card-image-${taskId}`, `tasks-card-body-${taskId}`, `tasks-card-actions-${taskId}`). Only adapt:
- `item?.id` → `item?.itemId` in the `onTapActions` call.
- `onTapImage`, `onTapActions`, `onTapCard` become optional; omit the click handler and the `cursor-pointer` class when the callback is absent.
- `imageUrl` used directly (caller already resolved `localObjectUrl ?? imageUrl`).
- `bottomAction` slot unchanged.
- Actions button (`⋮`) rendered only when `onTapActions` is provided.
- Image button is `cursor-default pointer-events-none` when `onTapImage` is absent.
- Body div is `cursor-default` (no role=button, no tabIndex) when `onTapCard` is absent.

Wrap the function in `memo`.

---

### Step 2 — Export from `@beyo/tasks`

**File to modify:** `packages/tasks/src/index.ts`

Add after the existing component exports:

```ts
export { TaskListCard } from "./components/TaskListCard";
export type { TaskListCardProps } from "./components/TaskListCard";
```

---

### Step 3 — Delete the app-local card

**File to delete:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx`

---

### Step 4 — Update `TasksView` to use the package card

**File to modify:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx`

Replace the local import:
```ts
// Before:
import { TaskListCard } from "./TaskListCard";

// After:
import { TaskListCard } from "@beyo/tasks";
```

Adapt the render call. `controller.cards` is a `TaskCardViewModel[]`. Map each card:

```tsx
<TaskListCard
  key={card.taskId}
  taskId={card.taskId}
  task={{
    task_type: card.task.task_type,
    state: card.task.state,
    return_source: card.task.return_source,
    ready_by_at: card.task.ready_by_at,
    is_overdue: card.task.is_overdue,
  }}
  item={card.item ? {
    itemId: card.item.id,
    article_number: card.item.article_number,
    sku: card.item.sku,
    item_major_category_snapshot: card.item.item_major_category_snapshot,
    quantity: card.item.quantity,
  } : null}
  imageUrl={card.firstImage
    ? (card.firstImage.localObjectUrl ?? card.firstImage.imageUrl)
    : null}
  onTapImage={controller.openImageViewer}
  onTapActions={controller.openTaskActions}
  onTapCard={controller.openTaskDetail}
/>
```

> `card.firstImage.localObjectUrl` — Codex: verify the exact field name on `ImageViewModel` from `@beyo/images`. It may be `localObjectUrl` or `local_object_url`. Read `@beyo/images` exports if uncertain.

---

### Step 5 — Update `PendingUpholsteryCard` to use the package card

**File to modify:** `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/components/PendingUpholsteryCard.tsx`

**Codex prerequisite reads before writing this step:**
- Full `PendingUpholsteryCard.tsx` (if not already read in full).
- `apps/managers-app/.../features/pending-upholstery/types.ts` to get `PendingSeatCardViewModel` field names.

Replace:
```ts
import { TaskListCard } from "@/features/tasks/components/TaskListCard";
```
With:
```ts
import { TaskListCard } from "@beyo/tasks";
```

Map `card` (of type `PendingSeatCardViewModel`) to the new `TaskListCard` props — the mapping follows the same pattern as Step 4, adapted to the `PendingSeatCardViewModel` shape:
- Use whatever field on `PendingSeatCardViewModel` holds the task data, item data, and first image URL.
- Pass the existing `bottomAction` JSX (upholstery picker / amount button) to the `bottomAction` prop unchanged.
- `onTapActions` on `PendingUpholsteryCard` is `(taskId: string) => void`; pass it directly — TypeScript's callback covariance allows it even though the card calls `onTapActions(taskId, itemId)`.

---

### Step 6 — Delete `QuickTaskListCard`

**File to delete:** `packages/task-working-sections/src/components/QuickTaskListCard.tsx`

---

### Step 7 — Rewrite `QuickTaskAssignSlidePage` to use `TaskListCard`

**File to modify:** `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx`

Remove:
```ts
import { QuickTaskListCard } from "../components/QuickTaskListCard";
```

Add:
```ts
import { TaskListCard } from "@beyo/tasks";
```

Also remove the `getFirstImageUrl` helper if it was imported from `QuickTaskListCard` — define it inline as a local utility inside the page file:

```ts
function resolveImageUrl(images: Array<Record<string, unknown>>): string | null {
  const first = images[0];
  if (!first) return null;
  return typeof first.image_url === "string" ? first.image_url : null;
}
```

Replace each `<QuickTaskListCard>` render with `<TaskListCard>`, mapping `TaskListItemRaw` fields:

```tsx
<TaskListCard
  key={task.task.client_id}
  taskId={task.task.client_id}
  task={{
    task_type: task.task.task_type,
    state: task.task.state,
    return_source: task.task.return_source,
    ready_by_at: task.task.ready_by_at,
    // is_overdue omitted → computed inside TaskListCard from ready_by_at
  }}
  item={task.primary_item ? {
    itemId: task.primary_item.client_id,
    article_number: task.primary_item.article_number,
    sku: task.primary_item.sku,
    item_major_category_snapshot: task.primary_item.item_major_category_snapshot,
    quantity: task.primary_item.quantity,
  } : null}
  imageUrl={resolveImageUrl(task.item_images)}
  onTapImage={controller.openImageViewer}
  onTapActions={controller.openTaskActions}
  onTapCard={controller.openTaskDetail}
  bottomAction={
    <div className="px-3 py-3">
      <button
        className="w-full rounded-2xl bg-(--color-primary) px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        data-testid={`quick-task-card-assign-${task.task.client_id}`}
        disabled={controller.savingTaskId !== null}
        type="button"
        onClick={() => onSelectTask(task.task.client_id)}
      >
        {controller.savingTaskId !== null ? "Saving..." : "Assign working sections"}
      </button>
    </div>
  }
/>
```

> The `onSelectTask` prop is already threaded through `QuickTaskAssignStagedForm` via `onSelectTask: (taskId: string) => void`. The assign button replaces `onAssign` prop that was on `QuickTaskListCard`.

The `disabled` prop that was on `QuickTaskListCard` (was `controller.savingTaskId !== null`) is now expressed directly on the button inside `bottomAction`.

---

### Step 8 — Remove `QuickTaskListCard` from package barrel

**File to modify:** `packages/task-working-sections/src/index.ts`

Remove the lines:
```ts
export { QuickTaskListCard } from "./components/QuickTaskListCard";
```

(and its type export if present)

---

## File summary

| # | File | Action | Notes |
|---|---|---|---|
| 1 | `packages/tasks/src/components/TaskListCard.tsx` | Created | New canonical card with package-level props |
| 2 | `packages/tasks/src/index.ts` | Modified | Add `TaskListCard` + `TaskListCardProps` exports |
| 3 | `apps/managers-app/.../features/tasks/components/TaskListCard.tsx` | Deleted | Replaced by package version |
| 4 | `apps/managers-app/.../features/tasks/components/TasksView.tsx` | Modified | Import + props adapter |
| 5 | `apps/managers-app/.../features/pending-upholstery/components/PendingUpholsteryCard.tsx` | Modified | Import + props adapter |
| 6 | `packages/task-working-sections/src/components/QuickTaskListCard.tsx` | Deleted | Replaced by `TaskListCard` |
| 7 | `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` | Modified | Use `TaskListCard` + inline assign button via `bottomAction` |
| 8 | `packages/task-working-sections/src/index.ts` | Modified | Remove `QuickTaskListCard` export |

**Total: 1 created, 2 deleted, 5 modified**

---

## Risks and mitigations

- Risk: `TASK_TYPE_ICON`, `TASK_TYPE_LABEL`, `RETURN_SOURCE_LABEL`, `TASK_STATE_VARIANT` may not yet have the right type signature in `lib/task-detail.ts` (e.g., `Record<TaskType, ...>` vs `Record<string, ...>`). If they do not, define them locally in `TaskListCard.tsx` as module-level constants.
  Mitigation: Codex reads `lib/task-detail.ts` before deciding.

- Risk: `ImageViewModel.localObjectUrl` field name may differ (could be `local_object_url` or camelCase `localObjectUrl`). If wrong the TypeScript check will catch it.
  Mitigation: Codex reads `@beyo/images` index or the `ImageViewModel` type definition.

- Risk: `PendingSeatCardViewModel` may not have a direct `firstImage` field — it may use a different shape for the image URL. If so, Codex derives the correct expression from reading the type.
  Mitigation: Step 5 explicitly requires Codex to read `PendingSeatCardViewModel` before writing the adapter.

- Risk: The `actions button` in `TaskListCard` was always rendered in the app (non-optional). Making `onTapActions` optional means existing callers that always pass it continue to work, but Codex must ensure the button is conditionally rendered (only when `onTapActions` is defined).
  Mitigation: Step 1 specifies this explicitly.

- Risk: Deleting `QuickTaskListCard` makes `PLAN_quick_task_assign_slide_corrections_20260627` §3 (overdue badge, return source, quantity pill, root testid, icon fix) obsolete. Those fixes are now covered by the shared `TaskListCard` in this plan.
  Mitigation: Corrections plan §1 and §2 (stale closure, staged deps) and §4 (HomeView styling) remain independent and should still be applied. Codex does not need to apply §3 of the corrections plan if this plan is executed.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 8 changed files
- Manual: open managers app tasks view — cards render identically (icon, type label, return source, date, overdue badge, quantity pill, state pill, actions button)
- Manual: open quick-assign slide (Pre-orders or Returns box on home) — cards render with the same visual output, assign button in bottom slot works
- Manual: open pending upholstery slide — `PendingUpholsteryCard` renders correctly with `TaskListCard` layout and bottom action (upholstery picker button)

## Review log

_(empty — plan not yet reviewed)_

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `David`
