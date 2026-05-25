# PLAN_task_working_sections_field_20260524

## Metadata

- Plan ID: `PLAN_task_working_sections_field_20260524`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-24T00:00:00Z`
- Last updated at (UTC): `2026-05-24T20:38:28Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add a "Working Sections" trigger field to the task detail page. Tapping it opens a dedicated slide page (stub for now). The field shows two count pills — how many working sections are assigned to the task and how many have completed their step.
- Business/user intent: Managers need a quick glance at step progress directly on the task detail without opening the full flow timeline. The working-sections slide page will later show full step management; this plan only delivers the trigger and the stub page.
- Non-goals: Full working-sections slide page UI (future plan). Editing/reordering task steps. Any new API calls — data is already present in `task_steps` from the existing task detail query.

## Scope

- In scope:
  - New component `TaskWorkingSectionsField` in `src/features/tasks/components/detail/`
  - New stub slide page `TaskWorkingSectionsSlidePage` in `src/pages/tasks/`
  - New surface ID `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` + `lazyWithPreload` registration in `src/features/tasks/surfaces.ts`
  - New surface props type `TaskWorkingSectionsSurfaceProps`
  - New opener `openWorkingSectionsSlide()` in `src/features/tasks/flows/use-task-detail.flow.ts`
  - Export `TaskWorkingSectionsField` from `src/features/tasks/components/detail/index.ts`
  - Render `<TaskWorkingSectionsField />` above `<TaskFlowTimeline />` in `TaskDetailSlidePage`
  - `data-testid` on all interactive and key display elements
  - Vitest unit test for the field component
  - Playwright test verifying field renders, pills show correct counts, and tap opens the slide
- Out of scope:
  - Full working-sections slide page content
  - Editing or reassigning task steps
  - Mutations or query invalidation — read-only display
- Assumptions:
  - `task_steps` is already fetched and available in `TaskDetailRaw` via the existing `useGetTaskQuery` — no new query needed
  - `assignedCount` = steps with `working_section_id !== null`
  - `completedCount` = steps with `closed_at !== null` (a step is "completed" when its `closed_at` datetime is populated)
  - The new slide surface opens with `{ taskId }` only — the stub page doesn't need additional props

## Clarifications required

_(none — all ambiguities resolved above)_

## Acceptance criteria

1. A "Working Sections" field button renders in the task detail `ContentCard`, above `TaskFlowTimeline`.
2. The field shows two pills: `{N} assigned` and `{N} completed`, derived from `task_steps`.
3. Tapping the field opens a slide page with the title "Working Sections" and body text "Coming soon".
4. The field and pills render correctly when `task_steps` is empty (shows `0 assigned`, `0 completed`).
5. `npm run typecheck` reports zero TypeScript errors.
6. Vitest unit test passes for `TaskWorkingSectionsField`.
7. Playwright mobile and desktop tests pass.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer dependency rules — context consumed by component only
- `architecture/07_components.md`: feature component conventions, `data-testid` placement
- `architecture/10_pages.md`: slide page shell pattern
- `architecture/15_feature_structure.md`: file placement and naming rules
- `architecture/28_surfaces.md`: surface registration and `surface: 'slide'` shape

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`); `drawer` excluded
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path (`@/utils/lazy-with-preload`), surface registration template
- `architecture/34_runtime_validation_local.md`: fixture paths, auth, `data-testid` naming convention, Playwright spec location

### File read intent — pattern vs. relational

Prohibited (pattern reads — contract already covers these):
- Reading another component to understand context hook usage → `07_components.md`
- Reading another slide page to understand page shell shape → `10_pages.md`
- Reading another surfaces file to understand registration shape → `28_surfaces_local.md`

Permitted (relational reads — understanding what exists):
- `src/features/tasks/types.ts` — to confirm `task_steps` field names (`working_section_id`, `closed_at`, `sequence_order`) ✓ (already read)
- `src/features/tasks/surfaces.ts` — to understand existing surface IDs, props types, and `lazyWithPreload` pattern in use ✓ (already read)
- `src/features/tasks/flows/use-task-detail.flow.ts` — to confirm existing opener pattern and `useSurface` usage ✓ (already read)
- `src/features/tasks/components/detail/index.ts` — to verify current exports ✓ (already read)
- `src/pages/tasks/TaskDetailSlidePage.tsx` — to confirm exact placement in JSX tree ✓ (already read)
- `src/features/tasks/components/detail/TaskIssuesSection.tsx` — to read pill class constant used across task detail components ✓ (already read)
- `src/features/items/components/fields/ItemUpholsteryField.tsx` — to confirm button class pattern the field should visually match ✓ (already read)

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: `component`, `surface`, `slide`, `field`, `context`
- Excluded alternatives: none

## Implementation plan

### Step 1 — New surface ID, props type, and `lazyWithPreload` registration

**File**: `src/features/tasks/surfaces.ts` _(modify)_

Add surface ID constant and props type alongside existing ones:

```ts
export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID = 'task-working-sections-slide';

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
};
```

Add `lazyWithPreload` loader function (do NOT use bare `lazy`):

```ts
function loadTaskWorkingSectionsSlidePage() {
  return import('@/pages/tasks/TaskWorkingSectionsSlidePage').then((module) => ({
    default: module.TaskWorkingSectionsSlidePage,
  }));
}

const taskWorkingSectionsSlide = lazyWithPreload(loadTaskWorkingSectionsSlidePage);
```

Add import at top (import `lazyWithPreload` is already present — do NOT add a duplicate):
```ts
// lazyWithPreload is already imported at the top of the file
```

Register in `taskSurfaces`:

```ts
[TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID]: {
  surface: 'slide',
  component: taskWorkingSectionsSlide.Component,
},
```

Export the preload function (alongside other preloads if any, or add a named export):
```ts
export const preloadTaskWorkingSectionsSurface = taskWorkingSectionsSlide.preload;
```

---

### Step 2 — New opener in the flow

**File**: `src/features/tasks/flows/use-task-detail.flow.ts` _(modify)_

Add import:
```ts
import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_SCHEDULED_DATE_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
} from '../surfaces';
```

Add to the returned object:
```ts
openWorkingSectionsSlide: () =>
  surface.open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, { taskId }),
```

---

### Step 3 — Stub slide page

**File**: `src/pages/tasks/TaskWorkingSectionsSlidePage.tsx` _(new file)_

```tsx
import { useEffect } from 'react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { TaskWorkingSectionsSurfaceProps } from '@/features/tasks/surfaces';

export function TaskWorkingSectionsSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskWorkingSectionsSurfaceProps>();
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Working Sections');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // header omitted — SurfaceHeaderContext.Provider creates a new object every SlidePageSurface render

  return (
    <div
      className="flex min-h-full items-center justify-center p-6"
      data-testid="task-working-sections-slide-page"
    >
      <p className="text-sm text-muted-foreground" data-testid="working-sections-coming-soon">
        Coming soon
      </p>
    </div>
  );
}
```

- `taskId` is read from surface props so the page is ready to load data when its content is built later.
- The `eslint-disable` comment on the dependency array mirrors the exact pattern used in `UpholsteryPickerSlidePage` — `header` is intentionally omitted because the context object is unstable.

---

### Step 4 — Field component

**File**: `src/features/tasks/components/detail/TaskWorkingSectionsField.tsx` _(new file)_

```tsx
import { ChevronRight } from 'lucide-react';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

const pillClass =
  'inline-flex items-center rounded-full border border-[var(--color-info-pill-border)] bg-[var(--color-info-pill)] px-3 py-1 text-xs font-medium text-foreground';

export function TaskWorkingSectionsField(): React.JSX.Element | null {
  const { taskDetail, openWorkingSectionsSlide } = useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const steps = taskDetail.task_steps;
  const assignedCount = steps.filter((s) => s.working_section_id !== null).length;
  const completedCount = steps.filter((s) => s.closed_at !== null).length;

  return (
    <button
      type="button"
      data-testid="task-working-sections-field"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={openWorkingSectionsSlide}
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">Working Sections</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <span className={pillClass} data-testid="working-sections-assigned-count">
            {assignedCount} assigned
          </span>
          <span className={pillClass} data-testid="working-sections-completed-count">
            {completedCount} completed
          </span>
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
```

Notes:
- Derives counts from `taskDetail.task_steps` — no action hook, no query, pure derived state.
- `openWorkingSectionsSlide` is provided by `useTaskDetailFlow` and spread into the controller, available in context.
- Pill class is sized `text-xs py-1` (slightly smaller than the issue pills at `text-sm py-1.5`) to suit the compact count label format.
- `data-testid` on both pills for Playwright assertions.

---

### Step 5 — Export from detail components index

**File**: `src/features/tasks/components/detail/index.ts` _(modify)_

Add:
```ts
export { TaskWorkingSectionsField } from './TaskWorkingSectionsField';
```

---

### Step 6 — Place in TaskDetailSlidePage

**File**: `src/pages/tasks/TaskDetailSlidePage.tsx` _(modify)_

Add to the import from `@/features/tasks/components/detail`:
```ts
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskFlowTimeline,
  TaskImagesSection,
  TaskIssuesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
} from '@/features/tasks/components/detail';
```

In `TaskDetailSlidePageContent`, insert `<TaskWorkingSectionsField />` directly above `<TaskFlowTimeline />`:

```tsx
<TaskWorkingSectionsField />
<TaskFlowTimeline />
```

Optionally add preload on mount (recommended — prevents skeleton flash when tapping the field):
```ts
import { preloadTaskWorkingSectionsSurface } from '@/features/tasks/surfaces';
import { usePreloadSurface } from '@/hooks/use-preload-surface';

// inside TaskDetailSlidePageContent, before the isPending check:
usePreloadSurface(preloadTaskWorkingSectionsSurface);
```

---

### Step 7 — Vitest unit test

**File**: `src/features/tasks/components/detail/TaskWorkingSectionsField.test.tsx` _(new file)_

Test shape:
- Render `<TaskWorkingSectionsField />` inside a `TaskDetailProvider`-compatible test wrapper (use existing test-utils pattern for task detail context).
- Scenario A — task with steps: provide `task_steps` with 3 entries (2 have `working_section_id`, 1 has `closed_at`). Assert pill text "2 assigned" and "1 completed".
- Scenario B — no steps: provide `task_steps: []`. Assert pills show "0 assigned" and "0 completed".
- Scenario C — click: assert `openWorkingSectionsSlide` mock was called once.

---

### Step 8 — Playwright test

**File**: `tests/playwright/features/tasks/working-sections-field.spec.ts` _(new file)_

```ts
import { test, expect } from '../../fixtures/app-fixture';

test.describe('task detail — working sections field', () => {
  test('field shows counts and opens slide', async ({ page, auth }) => {
    await auth.signIn();
    await page.goto('/tasks');
    await page.getByTestId('task-card').first().click();
    // Field is visible
    await expect(page.getByTestId('task-working-sections-field')).toBeVisible();
    // Pills are visible
    await expect(page.getByTestId('working-sections-assigned-count')).toBeVisible();
    await expect(page.getByTestId('working-sections-completed-count')).toBeVisible();
    // Tap opens slide
    await page.getByTestId('task-working-sections-field').click();
    await expect(page.getByTestId('task-working-sections-slide-page')).toBeVisible();
    await expect(page.getByTestId('working-sections-coming-soon')).toBeVisible();
  });
});
```

Run:
- `npx playwright test --grep "working sections field" --project=mobile`
- `npx playwright test --grep "working sections field" --project=desktop`

## Risks and mitigations

- Risk: `closed_at !== null` may not be the correct semantic for "completed" — the backend may use `state` instead.
  Mitigation: `closed_at` is the most explicit signal available in the current schema and doesn't require string matching against an undocumented enum. If a step `state` enum is documented later, the count derivation can be updated in one place (`TaskWorkingSectionsField`).

- Risk: `openWorkingSectionsSlide` not available in context if the flow return type is not updated.
  Mitigation: `useTaskDetailFlow` return is spread with `...flow` into `useTaskDetailController` which is the controller type (`TaskDetailController`). The flow return type is inferred — adding the new key to the returned object is sufficient.

- Risk: `lazyWithPreload` import already present in `surfaces.ts` — adding a second import causes a lint error.
  Mitigation: Codex must verify the import is already present before adding. The plan explicitly notes this.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep TaskWorkingSectionsField`: Vitest component tests pass
- `npx playwright test --grep "working sections field" --project=mobile`: passes
- `npx playwright test --grep "working sections field" --project=desktop`: passes

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
