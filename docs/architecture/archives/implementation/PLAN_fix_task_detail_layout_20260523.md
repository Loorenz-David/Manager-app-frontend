# PLAN_fix_task_detail_layout_20260523

## Metadata

- Plan ID: `PLAN_fix_task_detail_layout_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T14:48:27Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Fix the task detail page layout — hide the slide surface header (back arrow + title), rewrite `TaskDetailHeader` to the correct 3-row layout (article/state/menu · type/source · date/days-left), wrap the body sections in `ContentCard`, and rename `FormFieldContainer` → `ContentCard` since it is now used beyond forms.
- **Business/user intent:** The task detail page is full-screen. The surface header (back arrow) is redundant because the page has its own bottom close interaction. The header card must show task identity in a specific compact layout. The body must sit inside a visual card container.
- **Non-goals:**
  - Any changes to bottom action buttons (`TaskDetailBottomActions`) — deferred to a follow-up.
  - Any changes to the body section components (customer, issues, schedule, upholstery, timeline, images) — their internals are not touched.
  - Any changes to route/navigation logic.

## Scope

- In scope:
  - Rename `FormFieldContainer` → `ContentCard` everywhere (component name, type, exports, all callers).
  - Rewrite `TaskDetailHeader.tsx` with the correct 3-row layout and helper data moved to `task-detail.ts`.
  - Update `TaskDetailSlidePage.tsx` to hide the surface header and restructure the page around `ContentCard`.
  - Add pure helper functions (`formatDateDDMMYY`, `daysUntil`) and lookup maps (`TASK_TYPE_ICON`, `RETURN_SOURCE_LABEL`) to `features/tasks/lib/task-detail.ts`.

- Out of scope:
  - No changes to `DashedInfoSection`, `ConfirmActionButton`, or any other primitives.
  - No changes to `TaskDetailBottomActions`, `TaskCustomerSection`, `TaskIssuesSection`, `TaskScheduledDeliverySection`, `TaskImagesSection`, `TaskUpholsterySection`, or `TaskFlowTimeline` interiors.
  - No changes to the controller, provider, or flow.

- Assumptions:
  - `SlidePageSurface` already supports `setHeaderHidden(true)` via `SurfaceHeaderContext` — confirmed in `components/surfaces/SlidePageSurface.tsx`.
  - `controller.openMenu` is available in `TaskDetailContext` (comes from `useTaskDetailFlow` → `...flow`).
  - `framer-motion` is already installed and the `m` alias is in use across the codebase.
  - `animate-image-edit-shake` is already in `src/index.css`; `hsl(var(--destructive))` CSS variable is defined.

## Acceptance criteria

1. The back arrow and surface title are not visible when the task detail slide is open.
2. The task detail header card shows exactly: article number (or sku/fallback) + state pill + three-dot button on row 1; type icon + type label + optional `• return source` on row 2; calendar icon + dd-mm-yy date + days-left pill on row 3 (row 3 hidden when `ready_by_at` is null).
3. Article number does not appear anywhere in the body sections (only in the header).
4. All body sections are contained within a `ContentCard` wrapper below the header.
5. All existing callers of `FormFieldContainer` compile with `ContentCard` after the rename.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component SRP — no logic in component files
- `architecture/31_animations.md`: framer-motion `m` alias, `animate` prop patterns

### File read intent — pattern vs. relational

Permitted reads taken during plan authoring:
- `components/surfaces/SlidePageSurface.tsx` — confirmed `setHeaderHidden` API
- `features/tasks/lib/task-detail.ts` — confirmed existing helpers, identified what to add
- `features/tasks/components/detail/TaskDetailHeader.tsx` — established current structure to replace
- `pages/tasks/TaskDetailSlidePage.tsx` — confirmed current useEffect and page assembly
- `features/tasks/components/detail/TaskImagesSection.tsx` — confirmed uses `DashedInfoSection`, not `FormFieldContainer`
- `features/task-creation/components/ReturnFormContent.tsx`, `PreOrderFormContent.tsx`, `InternalFormContent.tsx` — confirmed they import `FormFieldContainer` from `@/components/primitives`
- `components/primitives/form-field-container/FormFieldContainer.tsx` — confirmed component shape
- `features/tasks/flows/use-task-detail.flow.ts` — confirmed `openMenu` is exposed

---

## Implementation plan

---

### Step 1 — Rename `FormFieldContainer` → `ContentCard`

The component is no longer form-specific. Rename the exported identifiers in place — no folder rename needed.

**Edit `components/primitives/form-field-container/FormFieldContainer.tsx`:**

Replace the entire file content:

```tsx
type ContentCardProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function ContentCard({
  children,
  'data-testid': testId,
}: ContentCardProps): React.JSX.Element {
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

**Edit `components/primitives/form-field-container/index.ts`:**

```ts
export { ContentCard } from './FormFieldContainer';
export type { ContentCardProps } from './FormFieldContainer';
```

**Edit `components/primitives/index.ts`:** Replace the `FormFieldContainer` export line:

```ts
// Before:
export { FormFieldContainer } from './form-field-container';

// After:
export { ContentCard } from './form-field-container';
export type { ContentCardProps } from './form-field-container';
```

**Edit `features/task-creation/components/ReturnFormContent.tsx`:** Replace import:
```ts
// Before:
import { FormFieldContainer } from '@/components/primitives';
// After:
import { ContentCard } from '@/components/primitives';
```
Then replace all JSX usages of `<FormFieldContainer` / `</FormFieldContainer>` with `<ContentCard` / `</ContentCard>` throughout the file.

**Edit `features/task-creation/components/PreOrderFormContent.tsx`:** Same import and JSX replacement as above.

**Edit `features/task-creation/components/InternalFormContent.tsx`:** Same import and JSX replacement as above.

---

### Step 2 — Add helpers to `features/tasks/lib/task-detail.ts`

Add the following at the end of the file. Do not modify existing exports.

```ts
import { Calendar, RotateCcw, ShoppingBag, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TaskReturnSource } from '@/features/tasks/types';

// ─── Type icon map (mirrors TaskListCard) ─────────────────────────────────────

export const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

// ─── Return source label map ──────────────────────────────────────────────────

export const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: 'After purchase',
  before_purchase: 'Before purchase',
  store_return: 'Store return',
};

// ─── Date formatting (UTC-based dd-mm-yy) ────────────────────────────────────

export function formatDateDDMMYY(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

// ─── Days until (positive = future, negative = overdue) ──────────────────────

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target.getTime() - todayUtcMs) / (1000 * 60 * 60 * 24));
}
```

Note: the `import { Calendar, ... }` line is for reference — Codex should add the lucide imports at the top of the file alongside existing imports, and add the `TaskReturnSource` and `TaskType` types to the existing `import type { ... } from '@/features/tasks/types'` statement. `Calendar` is imported for `TASK_TYPE_ICON` context only; it is not used in `task-detail.ts` itself (it is used in `TaskDetailHeader`). Do not add unused imports. The `Calendar` icon import should only appear in `TaskDetailHeader.tsx`.

Simplified version — only add these exports to `task-detail.ts`:

```ts
// Add to the existing import type line:
import type { TaskReturnSource, TaskType } from '@/features/tasks/types';
// (TaskType and TaskReturnSource may already be imported — add only what is missing)

// Add these new imports at the top of the file:
import type { LucideIcon } from 'lucide-react';
import { RotateCcw, ShoppingBag, Wrench } from 'lucide-react';

// Add these exports at the end of the file:

export const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

export const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: 'After purchase',
  before_purchase: 'Before purchase',
  store_return: 'Store return',
};

export function formatDateDDMMYY(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target.getTime() - todayUtcMs) / (1000 * 60 * 60 * 24));
}
```

---

### Step 3 — Rewrite `TaskDetailHeader.tsx`

Full replacement. The component renders a `ContentCard` containing three rows. The third row is omitted when `ready_by_at` is null. A `DaysLeftPill` internal component handles the relative date rendering.

Rules for `DaysLeftPill`:
- Hidden when `days === null` or `Math.abs(days) > 99`.
- When `days <= 3` (urgent, including negative/overdue): pulsating animation via `m.span` from framer-motion, cycling `backgroundColor` between `hsl(var(--destructive))` and `transparent`.
- Otherwise: static amber pill `bg-amber-500/15 text-amber-600`.
- Label: `{days}d` (negative values show as `-Nd` naturally from the number).

```tsx
import { Calendar } from 'lucide-react';
import { m } from 'framer-motion';

import { ContentCard, StatePill } from '@/components/primitives';
import { cn } from '@/lib/utils';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';
import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
  daysUntil,
  formatDateDDMMYY,
} from '../../lib/task-detail';

// ─── DaysLeftPill (internal) ──────────────────────────────────────────────────

function DaysLeftPill({ days }: { days: number }): React.JSX.Element | null {
  if (Math.abs(days) > 99) return null;

  const baseClass =
    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium';

  if (days <= 3) {
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
    <span className={cn(baseClass, 'bg-amber-500/15 text-amber-600')}>{days}d</span>
  );
}

// ─── TaskDetailHeader ─────────────────────────────────────────────────────────

export function TaskDetailHeader(): React.JSX.Element | null {
  const { taskDetail, openMenu } = useTaskDetailContext();

  if (!taskDetail) return null;

  const { task, item } = taskDetail;

  const articleLabel = item
    ? (item.article_number ?? item.sku ?? 'Article number missing')
    : 'No item linked';

  const TypeIcon = TASK_TYPE_ICON[task.task_type];
  const typeLabel = TASK_TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source
    ? RETURN_SOURCE_LABEL[task.return_source]
    : null;

  const readyByLabel = formatDateDDMMYY(task.ready_by_at ?? null);
  const days = daysUntil(task.ready_by_at ?? null);

  return (
    <ContentCard>
      {/* Row 1 — identity */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {articleLabel}
        </span>
        <StatePill
          label={task.state.charAt(0).toUpperCase() + task.state.slice(1).replace('_', ' ')}
          variant={TASK_STATE_VARIANT[task.state]}
        />
        <button
          aria-label="Task actions"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          type="button"
          onClick={openMenu}
        >
          <span className="flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 rounded-full bg-current" />
            ))}
          </span>
        </button>
      </div>

      {/* Row 2 — task type + return source */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {typeLabel}
          {returnSourceLabel ? ` • ${returnSourceLabel}` : ''}
        </span>
      </div>

      {/* Row 3 — ready-by date (only when set) */}
      {readyByLabel ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{readyByLabel}</span>
          {days !== null ? <DaysLeftPill days={days} /> : null}
        </div>
      ) : null}
    </ContentCard>
  );
}
```

---

### Step 4 — Update `TaskDetailSlidePage.tsx`

Two changes:
1. In the `useEffect`, replace `setTitle` + `setActions` with `setHeaderHidden(true)`.
2. Restructure the content: `TaskDetailHeader` stays outside `ContentCard`; all body sections are inside one `ContentCard`.

Full replacement:

```tsx
import { useEffect } from 'react';

import { ContentCard } from '@/components/primitives';
import {
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskFlowTimeline,
  TaskImagesSection,
  TaskIssuesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
} from '@/features/tasks/components/detail';
import { TaskDetailProvider, useTaskDetailContext } from '@/features/tasks/providers/TaskDetailProvider';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { TaskDetailSurfaceProps } from '@/features/tasks/surfaces';

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskDetailContext();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  if (controller.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading task…</div>;
  }

  if (controller.isError || !controller.taskDetail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Task details could not be loaded.</p>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          onClick={() => {
            void controller.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-[calc(var(--safe-bottom,0)+5.5rem)]">
      {/* Header card — article number, state, type, date */}
      <TaskDetailHeader />

      {/* Body card — all data sections */}
      <ContentCard>
        <TaskCustomerSection />
        <TaskIssuesSection />
        <TaskScheduledDeliverySection />
        <TaskImagesSection />
        <TaskUpholsterySection />
        <TaskFlowTimeline />
      </ContentCard>

      <TaskDetailBottomActions />
    </div>
  );
}

export function TaskDetailSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  if (!taskId) {
    return <div className="p-6 text-sm text-muted-foreground">Task id is missing.</div>;
  }

  return (
    <TaskDetailProvider taskId={taskId}>
      <TaskDetailSlidePageContent />
    </TaskDetailProvider>
  );
}
```

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `components/primitives/form-field-container/FormFieldContainer.tsx` | Rename export `FormFieldContainer` → `ContentCard`, type `FormFieldContainerProps` → `ContentCardProps` |
| `components/primitives/form-field-container/index.ts` | Re-export under `ContentCard` name |
| `components/primitives/index.ts` | Replace `FormFieldContainer` export with `ContentCard` + `ContentCardProps` |
| `features/task-creation/components/ReturnFormContent.tsx` | Import + JSX rename to `ContentCard` |
| `features/task-creation/components/PreOrderFormContent.tsx` | Import + JSX rename to `ContentCard` |
| `features/task-creation/components/InternalFormContent.tsx` | Import + JSX rename to `ContentCard` |
| `features/tasks/lib/task-detail.ts` | Add `TASK_TYPE_ICON`, `RETURN_SOURCE_LABEL`, `formatDateDDMMYY`, `daysUntil` |
| `features/tasks/components/detail/TaskDetailHeader.tsx` | Full rewrite — 3-row layout |
| `pages/tasks/TaskDetailSlidePage.tsx` | Hide surface header; wrap body in `ContentCard` |

### Files to delete

None.

---

## Risks and mitigations

- **Risk:** Renaming `FormFieldContainer` → `ContentCard` may break any dynamic string references or test IDs that contain the old name.
  **Mitigation:** The component has no hardcoded test IDs; callers pass `data-testid` as a prop. Only the JSX element name changes, not the rendered DOM.

- **Risk:** `ContentCard` nested inside `ContentCard` (e.g. `TaskDetailBottomActions` wrapping itself). Body sections use `DashedInfoSection`, not `ContentCard`, so no card-in-card nesting occurs in the body.
  **Mitigation:** Confirmed — all body section components use `DashedInfoSection` as their container.

- **Risk:** `header?.setHeaderHidden(true)` only fires once because `header` is stable. If the effect runs before the surface header context is ready, `header` would be `null` and the call is silently skipped.
  **Mitigation:** `useSurfaceHeader()` reads from `SurfaceHeaderContext` which is set synchronously by `SlidePageSurface` before children mount. The header reference will be non-null by the time the effect fires.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors — verifies the rename is complete across all callers
- Manual: open any task card → detail slide opens with no back arrow, no title bar → header shows article number + state + three-dot on row 1 → type + source on row 2 → date + days pill on row 3 → body sections inside a card container below
