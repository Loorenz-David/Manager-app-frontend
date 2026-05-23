# PLAN_fix_task_detail_body_sections_20260523

## Metadata

- Plan ID: `PLAN_fix_task_detail_body_sections_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T14:55:07Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Correct the task detail body layout: add a category+position row above the body sections; redesign the Customer Detail, Issues Found, and Delivery/Quantity sections to match the target UI; visually group those three sections with no gap between them using a new `DashedInfoGroup` primitive.
- **Business/user intent:** The body currently renders disconnected sections with generic layouts. The target design (see screenshot) groups the customer, issues, and schedule sections closely together, renders issue names as pill chips, and shows the delivery week as a tappable week pill alongside a quantity pill.
- **Non-goals:**
  - Upholstery section, images section, flow timeline — not touched in this plan.
  - Edit actions beyond what already exists in the controller (openScheduleSheet, openQuantitySheet, openIssueSheet).
  - Customer name lookup (the detail response contains only `customer_id`, not a customer name entity).
  - Long-press issue-delete shake mode — already exists in the issues section's delete button; not changed.

## Scope

- In scope:
  - New `DashedInfoGroup` primitive — a zero-gap wrapper for `DashedInfoSection` children.
  - `isoWeek` helper added to `task-detail.ts` — ISO 8601 week number from a date string.
  - New `TaskBodyCategoryRow` component — item category name (via `useItemCategoryPickerFlow`) + item position.
  - Redesign `TaskCustomerSection` — icon rows matching the screenshot: phone, email, fulfillment method.
  - Redesign `TaskIssuesSection` — pill chips per issue name + inline `+` add button.
  - Redesign `TaskScheduledDeliverySection` — two-column row: "Delivery Week" pill + "Quantity" pill.
  - Update `TaskDetailSlidePage` — insert category row, replace individual section rendering with `DashedInfoGroup`.
  - Export `DashedInfoGroup` from `components/primitives/index.ts`.

- Out of scope: see non-goals above.

- Assumptions:
  - `useItemCategoryPickerFlow` is exported from `@/features/items` — confirmed in `features/items/flows/use-item-category-picker.flow.ts`.
  - `item.item_category_id` is present on `TaskDetailItemRaw` (field confirmed in handoff contract and in `TaskDetailItemRawSchema`).
  - `item.item_position` is present on `TaskDetailItemRaw` (confirmed in handoff contract).
  - `item.quantity` is present on `TaskDetailItemRaw` (confirmed in handoff contract).
  - `openScheduleSheet` and `openQuantitySheet` are already wired in the controller/flow and available via `useTaskDetailContext()`.
  - `openIssueSheet` is already wired in the flow.
  - `DashedInfoSection` is already exported from `@/components/primitives`.

## Acceptance criteria

1. The first row of the body (inside `ContentCard`) shows the item category name on the left and item position on the right. If the category is loading, a short placeholder text is shown; once loaded the name appears. If `item_position` is null the right side is empty.
2. The three sections — Customer Detail, Issues Found, Delivery Week / Quantity — render with zero gap between them (visually grouped).
3. Customer Detail section shows icon rows for phone, email, and fulfillment method. Phone and email are tappable `<a>` links. Section is hidden when `task_type === 'internal'`.
4. Issues Found section shows one rounded pill per issue (label = `issue_name_snapshot`), and a `+` pill button at the end.
5. The Delivery / Quantity section shows two labelled columns. The week pill reads `"Week N"` (ISO week from `scheduled_start_at`). The quantity pill reads `"N piece"` / `"N pieces"`. Both pills are tappable. Week pill is hidden when `scheduled_start_at` is null. Quantity pill is hidden when item is null.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component SRP — no logic in component files
- `architecture/15_feature_structure.md`: component + primitive folder conventions

### File read intent — pattern vs. relational

Permitted reads taken during plan authoring:
- `features/items/flows/use-item-category-picker.flow.ts` — confirmed hook shape and return values
- `features/items/store/item-category-selection.store.ts` — confirmed `options` array field
- `features/tasks/components/detail/TaskCustomerSection.tsx` — established current structure to replace
- `features/tasks/components/detail/TaskIssuesSection.tsx` — established current structure to replace
- `features/tasks/components/detail/TaskScheduledDeliverySection.tsx` — established current structure to replace
- `pages/tasks/TaskDetailSlidePage.tsx` — confirmed current body assembly
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_tasks_items_upholstery_images_contracts_20260523.md` — confirmed `item_category_id`, `item_category_snapshot`, `item_position`, `quantity` are in the detail response

---

## Implementation plan

---

### Step 1 — Add `DashedInfoGroup` primitive

A zero-gap flex-column wrapper. Places `DashedInfoSection` children directly adjacent with no visible space between them.

**New file: `components/primitives/dashed-info-group/DashedInfoGroup.tsx`**

```tsx
type DashedInfoGroupProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function DashedInfoGroup({
  children,
  'data-testid': testId,
}: DashedInfoGroupProps): React.JSX.Element {
  return (
    <div className="flex flex-col" data-testid={testId}>
      {children}
    </div>
  );
}
```

**New file: `components/primitives/dashed-info-group/index.ts`**

```ts
export { DashedInfoGroup } from './DashedInfoGroup';
export type { DashedInfoGroupProps } from './DashedInfoGroup';
```

Wait — the type is exported from the component file; make sure the component file exports the type too:

```tsx
// DashedInfoGroup.tsx — the Props type must be exported so the barrel can re-export it
export type DashedInfoGroupProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};
```

**Edit `components/primitives/index.ts`:** Add:

```ts
export { DashedInfoGroup } from './dashed-info-group';
export type { DashedInfoGroupProps } from './dashed-info-group';
```

---

### Step 2 — Add `isoWeek` helper to `task-detail.ts`

Add at the end of `features/tasks/lib/task-detail.ts` (do not modify existing exports):

```ts
// ─── ISO 8601 week number ─────────────────────────────────────────────────────

export function isoWeek(dateString: string | null): number | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 3);
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const dayOfYear = (d.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayOfYear - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}
```

---

### Step 3 — Create `TaskBodyCategoryRow.tsx`

Reads `item_category_id` and `item_position` from the context. Uses `useItemCategoryPickerFlow` to resolve the category name — the flow checks the in-memory store first and only fetches from the API when the store is empty. Falls back to `item.item_category_snapshot` while loading.

**New file: `features/tasks/components/detail/TaskBodyCategoryRow.tsx`**

```tsx
import { useItemCategoryPickerFlow } from '@/features/items';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskBodyCategoryRow(): React.JSX.Element | null {
  const { taskDetail } = useTaskDetailContext();
  const { options } = useItemCategoryPickerFlow();

  if (!taskDetail?.item) return null;

  const { item } = taskDetail;

  const category = item.item_category_id
    ? (options.find((opt) => opt.client_id === item.item_category_id) ?? null)
    : null;

  // Use resolved category name, fall back to snapshot while loading
  const categoryLabel =
    category?.name ?? item.item_category_snapshot ?? null;

  if (!categoryLabel && !item.item_position) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <span className="text-sm text-muted-foreground">
        {categoryLabel ?? '—'}
      </span>
      {item.item_position ? (
        <span className="text-sm text-muted-foreground">{item.item_position}</span>
      ) : null}
    </div>
  );
}
```

---

### Step 4 — Redesign `TaskCustomerSection.tsx`

Full replacement. Renders a `DashedInfoSection` with icon rows. Phone and email are `<a>` links. Hidden when `task_type === 'internal'`.

```tsx
import { Mail, Phone, Truck } from 'lucide-react';

import { DashedInfoSection } from '@/components/primitives';

import { humanizeSnakeCase } from '../../lib/task-detail';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskCustomerSection(): React.JSX.Element | null {
  const { taskDetail } = useTaskDetailContext();

  if (!taskDetail) return null;

  const { task } = taskDetail;

  // Not shown for internal tasks
  if (task.task_type === 'internal') return null;

  const fulfillmentLabel = task.fulfillment_method
    ? humanizeSnakeCase(task.fulfillment_method)
    : null;

  return (
    <DashedInfoSection data-testid="task-detail-customer-section">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        Customer Detail
      </span>

      <div className="flex flex-col gap-2.5">
        {task.primary_phone_number ? (
          <a
            href={`tel:${task.primary_phone_number}`}
            className="flex items-center gap-2.5 text-sm"
          >
            <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-primary underline decoration-dotted">
              {task.primary_phone_number}
            </span>
          </a>
        ) : null}

        {task.primary_email ? (
          <a
            href={`mailto:${task.primary_email}`}
            className="flex items-center gap-2.5 text-sm"
          >
            <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-primary underline decoration-dotted">
              {task.primary_email}
            </span>
          </a>
        ) : null}

        {fulfillmentLabel ? (
          <div className="flex items-center gap-2.5 text-sm">
            <Truck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{fulfillmentLabel}</span>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

---

### Step 5 — Redesign `TaskIssuesSection.tsx`

Full replacement. Issues render as rounded pill chips in a flex-wrap row. The `+` add button is an inline pill at the end of the row. Issues section always renders (even when item is null — shows empty state).

```tsx
import { Plus } from 'lucide-react';

import { DashedInfoSection } from '@/components/primitives';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskIssuesSection(): React.JSX.Element | null {
  const { taskDetail, openIssueSheet } = useTaskDetailContext();

  if (!taskDetail) return null;

  const issues = taskDetail.item_issues;

  return (
    <DashedInfoSection data-testid="task-detail-issues-section">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        Issues Found
      </span>

      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <span
            key={issue.client_id}
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
          >
            {issue.issue_name_snapshot ?? '—'}
          </span>
        ))}

        {/* Add issue button — always at the end */}
        <button
          aria-label="Add issue"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
          type="button"
          onClick={openIssueSheet}
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </DashedInfoSection>
  );
}
```

---

### Step 6 — Redesign `TaskScheduledDeliverySection.tsx`

Full replacement. Two-column layout: "Delivery Week" on the left, "Quantity" on the right. Each column has a label and a tappable pill below it. Delivery week computed via `isoWeek()`. Quantity shows `"N piece"` / `"N pieces"`.

```tsx
import { DashedInfoSection } from '@/components/primitives';

import { isoWeek } from '../../lib/task-detail';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

const pillClass =
  'inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground';

export function TaskScheduledDeliverySection(): React.JSX.Element | null {
  const { taskDetail, openScheduleSheet, openQuantitySheet } = useTaskDetailContext();

  if (!taskDetail) return null;

  const { task, item } = taskDetail;

  const week = isoWeek(task.scheduled_start_at ?? null);
  const quantity = item?.quantity ?? null;
  const quantityLabel =
    quantity !== null
      ? `${quantity} ${quantity === 1 ? 'piece' : 'pieces'}`
      : null;

  // Hide section entirely if neither value is available
  if (week === null && quantityLabel === null) return null;

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        {/* Delivery Week column */}
        {week !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Delivery Week
            </span>
            <button className={pillClass} type="button" onClick={openScheduleSheet}>
              Week {week}
            </button>
          </div>
        ) : null}

        {/* Quantity column */}
        {quantityLabel !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Quantity
            </span>
            <button className={pillClass} type="button" onClick={openQuantitySheet}>
              {quantityLabel}
            </button>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

---

### Step 7 — Update `TaskDetailSlidePage.tsx`

Add `TaskBodyCategoryRow` and `DashedInfoGroup`. Insert the category row at the top of the `ContentCard` body, then group the three close sections together.

The full content section (inside the `ContentCard`) becomes:

```tsx
import { ContentCard, DashedInfoGroup } from '@/components/primitives';
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
} from '@/features/tasks/components/detail';
```

Content section (only the return JSX changes — replace the current `<ContentCard>` block):

```tsx
<ContentCard>
  {/* Category name + item position */}
  <TaskBodyCategoryRow />

  {/* Grouped sections — customer info, issues, delivery/quantity */}
  <DashedInfoGroup>
    <TaskCustomerSection />
    <TaskIssuesSection />
    <TaskScheduledDeliverySection />
  </DashedInfoGroup>

  {/* Remaining sections — images, upholstery, timeline */}
  <TaskImagesSection />
  <TaskUpholsterySection />
  <TaskFlowTimeline />
</ContentCard>
```

The rest of `TaskDetailSlidePage` (header, bottom actions, error/loading states, provider wrapper) is unchanged.

---

### Step 8 — Export `TaskBodyCategoryRow` from the detail barrel

**Edit `features/tasks/components/detail/index.ts`:** Add:

```ts
export { TaskBodyCategoryRow } from './TaskBodyCategoryRow';
```

---

## File manifest

### New files

| Path (relative to `src/`) | Purpose |
|---|---|
| `components/primitives/dashed-info-group/DashedInfoGroup.tsx` | Zero-gap group wrapper |
| `components/primitives/dashed-info-group/index.ts` | Barrel |
| `features/tasks/components/detail/TaskBodyCategoryRow.tsx` | Category name + position row |

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `components/primitives/index.ts` | Export `DashedInfoGroup` |
| `features/tasks/lib/task-detail.ts` | Add `isoWeek` |
| `features/tasks/components/detail/TaskCustomerSection.tsx` | Full redesign — icon rows |
| `features/tasks/components/detail/TaskIssuesSection.tsx` | Full redesign — pill chips |
| `features/tasks/components/detail/TaskScheduledDeliverySection.tsx` | Full redesign — week + quantity pills |
| `features/tasks/components/detail/index.ts` | Export `TaskBodyCategoryRow` |
| `pages/tasks/TaskDetailSlidePage.tsx` | Add `TaskBodyCategoryRow`, wrap 3 sections in `DashedInfoGroup` |

---

## Risks and mitigations

- **Risk:** `useItemCategoryPickerFlow` fires a fetch every time the detail page opens if the category store is empty (e.g. cold start, navigating directly to a task). This is a single paginated fetch of all categories.
  **Mitigation:** The flow already checks `options.length === 0` before enabling the query, so repeat opens don't re-fetch. `item_category_snapshot` is used as fallback during the brief loading window.

- **Risk:** `DashedInfoGroup` places sections with `flex-col` and no gap. Adjacent `DashedInfoSection` components each have `rounded-xl`, so at zero gap they will visually overlap their border radii. The resulting visual is independent pill-shaped sections touching at their corners.
  **Mitigation:** This matches the screenshot. If a tighter "merged border" look is wanted later, CSS sibling selectors (`[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none`) can be added to `DashedInfoGroup` without touching section components.

- **Risk:** `TaskCustomerSection` hides itself for `internal` task type. But if it's inside a `DashedInfoGroup` and hidden, the Issues section becomes the first child, inheriting any future group corner treatment.
  **Mitigation:** `DashedInfoGroup` currently has no corner treatment. If corner treatment is added later, use CSS `:first-child` / `:last-child` selectors which adapt automatically to hidden siblings.

- **Risk:** `openQuantitySheet` in the flow is guarded by `if (!itemId) return` — if the item is null, tapping the quantity pill does nothing visibly. The Quantity pill is already hidden when `item` is null (Step 6), so the button will never render.
  **Mitigation:** Belt-and-suspenders: the pill renders only when `item` is non-null; the controller guard is a secondary safety.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open a task with scheduled dates, an item, issues, and a customer → body shows category/position row → three grouped sections render close together → issues render as pills → delivery week and quantity show as tappable pills → customer section shows phone/email as tappable links
- Manual: open an internal task → customer section is hidden → issues and schedule still render
- Manual: open a task with no scheduled dates → delivery/quantity section is hidden
