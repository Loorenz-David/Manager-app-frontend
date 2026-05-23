# PLAN_task_list_card_20260523

## Metadata

- Plan ID: `PLAN_task_list_card_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T11:53:44Z`

## Goal and intent

Replace the placeholder `TaskListDecoyCard` with a real `TaskListCard`. The new card has a two-column layout: a 1:1 image square on the left and structured content on the right. A new `StatePill` primitive is created so task state badges can be reused across other feature cards.

## Scope

- In scope:
  - **New primitive**: `components/primitives/state-pill/` — generic `StatePill` with five semantic variants
  - **New card**: `features/tasks/components/TaskListCard.tsx` — full replacement for the decoy
  - **Deletion**: `features/tasks/components/TaskListDecoyCard.tsx`
  - **Update**: `TasksView.tsx` — pass the full `TaskCardViewModel` to the new card
  - **Barrel updates**: primitives `index.ts`

- Out of scope:
  - Annotation rendering on the thumbnail (intentionally omitted — annotations are editor-only)
  - Tap-to-detail navigation (already wired in the controller; card just calls `onTapCard`)
  - Wood category quantity pill label (field is TBD; the helper returns `null` for unknown categories)

## Acceptance criteria

1. Each rendered card shows the item's first image (no annotations) in a 1:1 square with `rounded-xl`. When `firstImage` is `null` the square shows a muted background.
2. A dark-faded quantity pill (`#N`) sits at the bottom-right corner of the image square when `item.item_major_category_snapshot?.toLowerCase() === 'seat'`; hidden for all other categories.
3. Row 1 (content right side) renders left-to-right: article label, `StatePill` with the task state, three-dot actions button. Article label priority: `item.article_number` → `item.sku` → `"Article number missing"` (when item exists) or `"No item linked"` (when `item` is `null`).
4. Row 2 renders: task-type icon, `"{type label}"` or `"{type label} • {return source label}"`, and — far right — a calendar icon plus `dd-mm-yy` formatted `ready_by_at`. The date is omitted entirely when `ready_by_at` is `null`.
5. `StatePill` is a standalone primitive with no coupling to the tasks feature; it accepts any `label` string and a `StatePillVariant`.
6. No nested `<button>` elements anywhere in the card DOM. The right content tap target is a `div[role="button"]`; the actions button is a `<button>` inside that div (stopPropagation).
7. `npm run typecheck` passes with zero errors.

## Implementation plan

---

### Step 1 — Create `StatePill` primitive

**New file: `components/primitives/state-pill/StatePill.tsx`**

```tsx
import { cn } from '@/lib/utils';

export type StatePillVariant = 'neutral' | 'active' | 'warning' | 'success' | 'danger';

const VARIANT_CLASS: Record<StatePillVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export type StatePillProps = {
  label: string;
  variant: StatePillVariant;
  className?: string;
};

export function StatePill({ label, variant, className }: StatePillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
```

**New file: `components/primitives/state-pill/index.ts`**

```ts
export { StatePill } from './StatePill';
export type { StatePillProps, StatePillVariant } from './StatePill';
```

---

### Step 2 — Export from `components/primitives/index.ts`

Add at the end of the existing barrel:

```ts
export { StatePill } from './state-pill';
export type { StatePillProps, StatePillVariant } from './state-pill';
```

---

### Step 3 — Create `TaskListCard`

**New file: `features/tasks/components/TaskListCard.tsx`**

```tsx
import { Calendar, RotateCcw, ShoppingBag, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { StatePill } from '@/components/primitives';
import type { StatePillVariant } from '@/components/primitives';
import type { Item } from '@/features/items/types';

import type { TaskCardViewModel, TaskReturnSource, TaskState, TaskType } from '../types';

// ─── helpers (private) ────────────────────────────────────────────────────────

function formatDateDDMMYY(dateString: string | null): string | null {
  if (!dateString) return null;
  const d = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

const TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

const TYPE_LABEL: Record<TaskType, string> = {
  return: 'Return',
  pre_order: 'Pre-order',
  internal: 'Internal',
};

const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: 'After purchase',
  before_purchase: 'Before purchase',
  store_return: 'Store return',
};

const STATE_VARIANT: Record<TaskState, StatePillVariant> = {
  pending: 'neutral',
  assigned: 'active',
  working: 'active',
  stalled: 'warning',
  ready: 'success',
  resolved: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

// Returns the quantity pill label for known major categories; null = hide pill.
function getQuantityPillLabel(item: Item | null): string | null {
  if (!item) return null;
  const cat = item.item_major_category_snapshot?.toLowerCase();
  if (cat === 'seat') return `#${item.quantity}`;
  // 'wood' and other categories: TBD
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: () => void;
  onTapActions: () => void;
  onTapCard: () => void;
};

export function TaskListCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
}: TaskListCardProps): React.JSX.Element {
  const { taskId, task, item, firstImage } = card;

  const TypeIcon = TYPE_ICON[task.task_type];
  const typeLabel = TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source ? RETURN_SOURCE_LABEL[task.return_source] : null;
  const stateVariant = STATE_VARIANT[task.state];
  const stateLabel = task.state.charAt(0).toUpperCase() + task.state.slice(1);

  const articleLabel = item
    ? (item.article_number ?? item.sku ?? 'Article number missing')
    : 'No item linked';

  const imageUrl = firstImage ? (firstImage.localObjectUrl ?? firstImage.imageUrl) : null;
  const quantityPillLabel = getQuantityPillLabel(item);
  const readyByLabel = formatDateDDMMYY(task.ready_by_at);

  return (
    <div
      className="mx-4 flex flex-row overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`tasks-card-${taskId}`}
    >
      {/* Left: 1:1 image square */}
      <button
        aria-label="View item image"
        className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
        data-testid={`tasks-card-image-${taskId}`}
        type="button"
        onClick={onTapImage}
      >
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            loading="lazy"
            src={imageUrl}
          />
        ) : null}

        {quantityPillLabel ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
            {quantityPillLabel}
          </span>
        ) : null}
      </button>

      {/* Right: content — div[role=button] for card tap; no nested <button> violations */}
      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-col px-3 py-2.5"
        data-testid={`tasks-card-body-${taskId}`}
        role="button"
        tabIndex={0}
        onClick={onTapCard}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onTapCard();
          }
        }}
      >
        {/* Row 1: article label · state pill · actions */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {articleLabel}
          </span>

          <StatePill label={stateLabel} variant={stateVariant} />

          <button
            aria-label="Task actions"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            data-testid={`tasks-card-actions-${taskId}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTapActions();
            }}
          >
            <span className="flex flex-col items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1 rounded-full bg-current" />
              ))}
            </span>
          </button>
        </div>

        {/* Row 2: type icon · type / return source · ready-by date */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <TypeIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />

          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {typeLabel}
            {returnSourceLabel ? ` • ${returnSourceLabel}` : ''}
          </span>

          {readyByLabel ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3" />
              {readyByLabel}
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
```

---

### Step 4 — Update `TasksView.tsx` and delete `TaskListDecoyCard.tsx`

**Delete** `features/tasks/components/TaskListDecoyCard.tsx`.

**Edit** `features/tasks/components/TasksView.tsx`:

Replace the import:

```ts
// Before:
import { TaskListDecoyCard } from './TaskListDecoyCard';

// After:
import { TaskListCard } from './TaskListCard';
```

Replace the card rendering inside `controller.cards.map(...)`:

```tsx
// Before:
<TaskListDecoyCard
  key={card.taskId}
  taskId={card.taskId}
  onTapActions={() => controller.openTaskActions(card.taskId)}
  onTapCard={() => controller.openTaskDetail(card.taskId)}
  onTapImage={() => controller.openImageViewer(card.taskId)}
/>

// After:
<TaskListCard
  key={card.taskId}
  card={card}
  onTapActions={() => controller.openTaskActions(card.taskId)}
  onTapCard={() => controller.openTaskDetail(card.taskId)}
  onTapImage={() => controller.openImageViewer(card.taskId)}
/>
```

No other changes to `TasksView.tsx`.

---

## File manifest

### New files

| Path (relative to `src/`) | Purpose |
|---|---|
| `components/primitives/state-pill/StatePill.tsx` | `StatePill` component + `StatePillVariant` type |
| `components/primitives/state-pill/index.ts` | Barrel re-export |
| `features/tasks/components/TaskListCard.tsx` | Real task card (replaces decoy) |

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `components/primitives/index.ts` | Add `StatePill` + `StatePillProps` + `StatePillVariant` exports |
| `features/tasks/components/TasksView.tsx` | Import `TaskListCard`; pass `card` prop instead of `taskId` |

### Files to delete

| Path (relative to `src/`) |
|---|
| `features/tasks/components/TaskListDecoyCard.tsx` |

## State → variant reference

| Task state | `StatePillVariant` | Visual |
|---|---|---|
| `pending` | `neutral` | gray |
| `assigned` | `active` | blue |
| `working` | `active` | blue |
| `stalled` | `warning` | amber |
| `ready` | `success` | green |
| `resolved` | `success` | green |
| `failed` | `danger` | red |
| `cancelled` | `neutral` | gray |

## Validation plan

- `npm run typecheck`: zero errors
- Manual — cards render with real article numbers, state pills, type icons, return source labels, and dates
- Manual — quantity pill appears for seat-category items only
- Manual — tapping the image opens the viewer; tapping the body opens task detail; tapping the three dots opens the actions sheet (no card navigation)
- Manual — state pill colors match the variant table above

## Review log

_(empty — awaiting implementation)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `davidloorenz`
