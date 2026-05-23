# PLAN_fix_task_detail_page_shell_20260523

## Metadata

- Plan ID: `PLAN_fix_task_detail_page_shell_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T14:58:19Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Three targeted layout corrections to the task detail page shell: (1) remove the `ContentCard` wrapper from the header so it renders on a transparent background; (2) make the body `ContentCard` expand full-width with no horizontal page padding; (3) replace `TaskDetailBottomActions` with a fixed Edit + Close bar permanently visible above the content.
- **Business/user intent:** The header information should appear directly on the page background (no card box), the body content card should feel full-width like a native screen section, and the actions must always be reachable without scrolling.
- **Non-goals:**
  - No changes to the header's row content, data, or logic.
  - No changes to body section components (customer, issues, schedule, images, upholstery, timeline).
  - No changes to `SlidePageSurface`.

## Scope

- In scope:
  - `TaskDetailHeader.tsx` — remove `ContentCard` wrapper; add direct horizontal padding to the header rows.
  - `TaskDetailBottomActions.tsx` — full rewrite: fixed bottom bar with Edit (left) and Close (right) buttons.
  - `TaskDetailSlidePage.tsx` — remove horizontal page padding so `ContentCard` spans full width; adjust bottom padding to account for the fixed bar height.

- Out of scope: everything else.

- Assumptions:
  - `useSurface().closeTop()` correctly closes the task detail slide — confirmed in `SlidePageSurface` and `SurfaceProvider` (`closeTop` removes the topmost stack entry).
  - `controller.openEditTask` is available on the context — confirmed in `useTaskDetailFlow`.
  - `SlidePageSurface` is `fixed inset-0`, so a `fixed bottom-0 left-0 right-0` child inside it anchors to the viewport bottom, which is the bottom of the slide — this is the established pattern in the codebase (see `TasksView` `pb-[calc(var(--safe-bottom,0)+5.5rem)]`).
  - `var(--safe-bottom)` CSS variable is set by the app shell for devices with a home indicator.

## Acceptance criteria

1. The task detail header rows render directly on the page background with no card/shadow behind them.
2. The body `ContentCard` has no horizontal gap to the screen edges.
3. A fixed bottom bar with Edit (full-width left half) and Close (full-width right half) is always visible regardless of scroll position.
4. Tapping Close dismisses the task detail slide.
5. Tapping Edit opens the edit surface (existing `controller.openEditTask`).
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component SRP — no logic in component files

### File read intent — pattern vs. relational

Permitted reads taken during plan authoring:
- `features/tasks/components/detail/TaskDetailHeader.tsx` — confirmed current `ContentCard` wrapper to remove
- `features/tasks/components/detail/TaskDetailBottomActions.tsx` — confirmed current shape to replace
- `pages/tasks/TaskDetailSlidePage.tsx` — confirmed current `p-4` padding and ContentCard position
- `components/surfaces/SlidePageSurface.tsx` — confirmed `fixed inset-0` structure, `requestClose` in context

---

## Implementation plan

---

### Step 1 — Remove `ContentCard` from `TaskDetailHeader.tsx`

Replace the `<ContentCard>` wrapper with a plain `<div>` that applies the same horizontal and vertical padding directly. The three interior rows are unchanged.

```tsx
import { m } from 'framer-motion';
import { Calendar } from 'lucide-react';

import { StatePill } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';
import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
  daysUntil,
  formatDateDDMMYY,
  humanizeSnakeCase,
} from '../../lib/task-detail';

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

  return <span className={cn(baseClass, 'bg-amber-500/15 text-amber-600')}>{days}d</span>;
}

export function TaskDetailHeader(): React.JSX.Element | null {
  const { openMenu, taskDetail } = useTaskDetailContext();

  if (!taskDetail) return null;

  const { task, item } = taskDetail;
  const articleLabel = item
    ? (item.article_number ?? item.sku ?? 'Article number missing')
    : 'No item linked';
  const TypeIcon = TASK_TYPE_ICON[task.task_type];
  const typeLabel = TASK_TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source ? RETURN_SOURCE_LABEL[task.return_source] : null;
  const readyByLabel = formatDateDDMMYY(task.ready_by_at ?? null);
  const days = daysUntil(task.ready_by_at ?? null);

  return (
    // No card wrapper — transparent background, direct padding only
    <div className="flex flex-col gap-2 px-4 py-3">
      {/* Row 1 — identity */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {articleLabel}
        </span>
        <StatePill
          label={humanizeSnakeCase(task.state) ?? task.state}
          variant={TASK_STATE_VARIANT[task.state]}
        />
        <button
          aria-label="Task actions"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          type="button"
          onClick={openMenu}
        >
          <span className="flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((index) => (
              <span key={index} className="size-1 rounded-full bg-current" />
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
    </div>
  );
}
```

Key change: `<ContentCard>` → `<div className="flex flex-col gap-2 px-4 py-3">`. The `ContentCard` import is removed.

---

### Step 2 — Rewrite `TaskDetailBottomActions.tsx`

Fixed bottom bar. Two equal-width buttons: Edit on the left, Close on the right. Close calls `useSurface().closeTop()` which dismisses the topmost surface (the task detail slide). Edit calls `controller.openEditTask`.

```tsx
import { useSurface } from '@/hooks/use-surface';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskDetailBottomActions(): React.JSX.Element {
  const { openEditTask } = useTaskDetailContext();
  const surface = useSurface();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
      <button
        className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        type="button"
        onClick={openEditTask}
      >
        Edit
      </button>
      <button
        className="flex-1 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
        type="button"
        onClick={() => surface.closeTop()}
      >
        Close
      </button>
    </div>
  );
}
```

Notes:
- `shadow-[0_-1px_0_0_var(--color-border)]` draws a 1px top border line (separator from scrollable content).
- `pb-[calc(var(--safe-bottom,0)+1rem)]` respects the device safe area (home indicator on iPhone).
- `bg-background` prevents content bleeding through the bar when scrolling.
- `text-primary-foreground` is the correct Tailwind token for text on a primary-colored background (not `text-white`).

---

### Step 3 — Update `TaskDetailSlidePage.tsx`

Two changes:
1. Remove `px-4` from the outer wrapper div so `ContentCard` spans full width.
2. Update `pb` to account for the fixed bar height (~3rem button + 1rem padding + safe area ≈ 5rem total, using the same formula as `TasksView`).

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
    // No horizontal padding — ContentCard spans full width.
    // pb reserves space above the fixed bottom bar.
    <div className="flex flex-col gap-4 pb-[calc(var(--safe-bottom,0)+5rem)] pt-2">
      {/* Header — transparent, own px-4 */}
      <TaskDetailHeader />

      {/* Body card — full width */}
      <ContentCard>
        <TaskCustomerSection />
        <TaskIssuesSection />
        <TaskScheduledDeliverySection />
        <TaskImagesSection />
        <TaskUpholsterySection />
        <TaskFlowTimeline />
      </ContentCard>

      {/* Fixed bottom bar — always visible */}
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

Key changes from current file:
- `p-4` → `pb-[calc(var(--safe-bottom,0)+5rem)] pt-2` (no horizontal padding).
- `<TaskDetailBottomActions />` stays in the JSX tree; its `fixed` CSS detaches it from the scroll flow.

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/tasks/components/detail/TaskDetailHeader.tsx` | Remove `ContentCard` wrapper; add `<div className="flex flex-col gap-2 px-4 py-3">` |
| `features/tasks/components/detail/TaskDetailBottomActions.tsx` | Full rewrite — fixed bar, Edit + Close |
| `pages/tasks/TaskDetailSlidePage.tsx` | Remove `px-4` from outer div; update `pb` value |

---

## Risks and mitigations

- **Risk:** `fixed bottom-0 left-0 right-0` positions relative to the viewport. When multiple surfaces are open (e.g. a sheet on top of the detail slide), the fixed bar stays visible underneath the sheet. This is correct — it disappears visually behind the sheet overlay.
  **Mitigation:** `z-20` on the bar is lower than the sheet overlay z-index, so the sheet properly covers it.

- **Risk:** `ContentCard` with `rounded-xl` and no horizontal margin creates a card that spans edge-to-edge. On screens with a physical bezel the card fills the full logical width, so rounded corners appear only at the very top-left/top-right/bottom-left/bottom-right pixels of the card. This is intentional per the user's specification.
  **Mitigation:** None needed — this is the desired layout.

- **Risk:** `text-primary-foreground` may not be defined in the project's Tailwind config. If the project uses `text-white` for text on primary buttons, use `text-white` instead.
  **Mitigation:** Check `tailwind.config` — if `primary-foreground` exists in the theme, use it; otherwise use `text-white`.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open a task → header rows appear directly on the background with no card box → body card fills full screen width → fixed bar with Edit / Close always visible at bottom → scrolling the body does not move the bar → tapping Close dismisses the slide
